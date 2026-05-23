#!/usr/bin/env python3
"""
Sync Mongo product financial ids from an inventory export.

The script matches rows by normalized product name and package quantity, then
updates each matching Mongo financial with catalogProductBarcodeId/product_barcode_id
    and preserves existing Mongo mkid by default.

Examples:
  python scripts/sync_mongo_ids_from_inventory_export.py \
    --inventory-export outputs/inventory_products.json \
    --mongo-products outputs/mongo_products.json \
    --updated-products outputs/mongo_products.updated.json \
    --report outputs/mongo_id_sync_report.json

  python scripts/sync_mongo_ids_from_inventory_export.py \
    --inventory-export outputs/inventory_products.json \
    --mongo-products outputs/mongo_products.json \
    --mongo-uri mongodb://localhost:27017/mkpos \
    --db mkpos \
    --collection products \
    --apply
"""

from __future__ import annotations

import argparse
import copy
import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


UNIT_ALIASES = {
    "KG": "KGS",
    "KGS": "KGS",
    "KILOGRAM": "KGS",
    "KILOGRAMS": "KGS",
    "G": "GMS",
    "GM": "GMS",
    "GMS": "GMS",
    "GRAM": "GMS",
    "GRAMS": "GMS",
    "ML": "ML",
    "LTR": "LTR",
    "L": "LTR",
    "LT": "LTR",
    "LTS": "LTR",
    "LITER": "LTR",
    "LITRE": "LTR",
    "PCS": "PCS",
    "PC": "PCS",
    "UNIT": "PCS",
    "UNITS": "PCS",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def pick_id(*values: Any) -> str:
    for value in values:
        if value is None or value == "":
            continue
        if isinstance(value, dict) and "$oid" in value:
            return str(value["$oid"])
        return str(value)
    return ""


def to_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None


def normalize_unit(value: Any) -> str:
    text = re.sub(r"[^A-Za-z]", "", str(value or "")).upper()
    return UNIT_ALIASES.get(text, text)


def normalize_name(value: Any) -> str:
    text = str(value or "").upper()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"\b\d+(?:\.\d+)?\s*(KG|KGS|G|GM|GMS|ML|L|LT|LTR|LTS)\b", " ", text)
    text = re.sub(r"\b(BAG|CASE|CA|PACK|PKT|POUCH|TIN|BOTTLE)\b", " ", text)
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def quantity_from_name(value: Any) -> tuple[Decimal, str] | None:
    text = str(value or "").upper()
    match = re.search(r"\b(\d+(?:\.\d+)?)\s*(KG|KGS|G|GM|GMS|ML|L|LT|LTR|LTS)\b", text)
    if not match:
        return None
    qty = to_decimal(match.group(1))
    unit = normalize_unit(match.group(2))
    if qty is None:
        return None
    return qty, unit


def get_inventory_quantity(row: dict[str, Any]) -> tuple[Decimal, str] | None:
    from_name = quantity_from_name(row.get("product_name") or row.get("name"))
    if from_name:
        return from_name

    qty = to_decimal(row.get("purchase_qty") or row.get("quantity") or row.get("barcode_quantity"))
    unit = normalize_unit(row.get("unit") or row.get("unit_name") or row.get("units"))
    if qty is not None and unit:
        return qty, unit
    return None


def get_financial_quantity(financial: dict[str, Any]) -> tuple[Decimal, str] | None:
    qty = to_decimal(financial.get("quantity") or financial.get("barcode_quantity"))
    unit = normalize_unit(financial.get("units") or financial.get("unit") or financial.get("unit_name"))
    if qty is not None and unit:
        return qty, unit
    return None


def make_match_key(name: Any, quantity: tuple[Decimal, str] | None) -> tuple[str, str, str] | None:
    if not quantity:
        return None
    qty, unit = quantity
    return normalize_name(name), str(qty.normalize()), unit


def get_inventory_product_barcode_id(row: dict[str, Any]) -> int | str:
    return as_int_text(
        row.get("product_barcode_id")
        or row.get("productBarcodeId")
        or row.get("catalogProductBarcodeId")
        or row.get("catalogProductBarcodeID")
        or row.get("id")
    )


def build_inventory_index(rows: list[dict[str, Any]]) -> tuple[dict[tuple[str, str, str], dict[str, Any]], list[dict[str, Any]]]:
    index: dict[tuple[str, str, str], dict[str, Any]] = {}
    duplicates: list[dict[str, Any]] = []

    for row in rows:
        key = make_match_key(row.get("product_name") or row.get("name"), get_inventory_quantity(row))
        if not key:
            continue
        if key in index:
            duplicates.append({"key": key, "first": index[key], "duplicate": row})
            continue
        index[key] = row

    return index, duplicates


def build_inventory_id_indexes(rows: list[dict[str, Any]]) -> dict[str, dict[str, dict[str, Any]]]:
    indexes = {
        "financial": {},
        "product_quantity": {},
    }

    for row in rows:
      financial_id = pick_id(row.get("mongo_financial_id"), row.get("financial_id"))
      if financial_id:
          indexes["financial"][financial_id] = row

      product_id = pick_id(row.get("mongo_product_id"), row.get("product_id"))
      quantity = get_inventory_quantity(row)
      if product_id and quantity:
          qty, unit = quantity
          indexes["product_quantity"][f"{product_id}::{qty.normalize()}::{unit}"] = row

    return indexes


def as_int_text(value: Any) -> int | str:
    text = str(value or "").strip()
    if re.fullmatch(r"\d+", text):
        return int(text)
    return text


def value_for_mkid(row: dict[str, Any], source: str) -> int | str | None:
    if source == "none":
        return None
    if source == "product_barcode_id":
        return get_inventory_product_barcode_id(row)
    if source == "product_code_numeric":
        match = re.search(r"(\d+)", str(row.get("product_code") or ""))
        return int(match.group(1)) if match else None
    raise ValueError(f"Unsupported mkid source: {source}")


def sync_products(
    mongo_products: list[dict[str, Any]],
    inventory_rows: list[dict[str, Any]],
    mkid_source: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    inventory_index, duplicates = build_inventory_index(inventory_rows)
    id_indexes = build_inventory_id_indexes(inventory_rows)
    updated_products = copy.deepcopy(mongo_products)
    changes: list[dict[str, Any]] = []

    for product in updated_products:
        product_name = product.get("name") or product.get("productname") or product.get("englishname")
        product_id = pick_id(product.get("_id"), product.get("id"))
        for detail in product.get("details") or []:
            for financial in detail.get("financials") or []:
                financial_id = pick_id(financial.get("_id"), financial.get("id"))
                financial_quantity = get_financial_quantity(financial)
                quantity_key = None
                if product_id and financial_quantity:
                    qty, unit = financial_quantity
                    quantity_key = f"{product_id}::{qty.normalize()}::{unit}"

                key = make_match_key(product_name, get_financial_quantity(financial))
                row = (
                    id_indexes["financial"].get(financial_id)
                    or (id_indexes["product_quantity"].get(quantity_key) if quantity_key else None)
                    or (inventory_index.get(key) if key else None)
                )
                if not row:
                    continue

                product_barcode_id = get_inventory_product_barcode_id(row)
                mkid = value_for_mkid(row, mkid_source)
                before = {
                    "catalogProductBarcodeId": financial.get("catalogProductBarcodeId"),
                    "product_barcode_id": financial.get("product_barcode_id"),
                    "mkid": financial.get("mkid"),
                    "mk_barcode": financial.get("mk_barcode"),
                }

                financial["catalogProductBarcodeId"] = product_barcode_id
                financial["product_barcode_id"] = product_barcode_id
                if mkid is not None:
                    financial["mkid"] = mkid
                if row.get("mk_barcode"):
                    financial["mk_barcode"] = row.get("mk_barcode")

                changes.append(
                    {
                        "product_id": product_id,
                        "financial_id": financial_id,
                        "product_name": product_name,
                        "quantity": key[1] if key else "",
                        "unit": key[2] if key else "",
                        "matched_inventory_product_id": row.get("id"),
                        "matched_mongo_financial_id": row.get("mongo_financial_id"),
                        "matched_product_code": row.get("product_code"),
                        "before": before,
                        "after": {
                            "catalogProductBarcodeId": financial.get("catalogProductBarcodeId"),
                            "product_barcode_id": financial.get("product_barcode_id"),
                            "mkid": financial.get("mkid"),
                            "mk_barcode": financial.get("mk_barcode"),
                        },
                    }
                )

    return updated_products, changes, duplicates


def apply_to_mongo(args: argparse.Namespace, changes: list[dict[str, Any]]) -> None:
    try:
        from pymongo import MongoClient
        from bson import ObjectId
    except ImportError as exc:
        raise SystemExit("Install pymongo first: python -m pip install pymongo") from exc

    client = MongoClient(args.mongo_uri)
    collection = client[args.db][args.collection]

    for change in changes:
        product_id = change["product_id"]
        financial_id = change["financial_id"]
        after = change["after"]
        product_filter: dict[str, Any] = {"_id": product_id}
        financial_filter: dict[str, Any] = {"f._id": financial_id}

        if re.fullmatch(r"[0-9a-fA-F]{24}", product_id):
            product_filter = {"_id": ObjectId(product_id)}
        if re.fullmatch(r"[0-9a-fA-F]{24}", financial_id):
            financial_filter = {"f._id": ObjectId(financial_id)}

        collection.update_one(
            product_filter,
            {
                "$set": {
                    "details.$[].financials.$[f].catalogProductBarcodeId": after["catalogProductBarcodeId"],
                    "details.$[].financials.$[f].product_barcode_id": after["product_barcode_id"],
                    "details.$[].financials.$[f].mkid": after["mkid"],
                    "details.$[].financials.$[f].mk_barcode": after.get("mk_barcode"),
                }
            },
            array_filters=[financial_filter],
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory-export", required=True, type=Path)
    parser.add_argument("--mongo-products", required=True, type=Path)
    parser.add_argument("--updated-products", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument(
        "--mkid-source",
        choices=["product_barcode_id", "product_code_numeric", "none"],
        default="none",
    )
    parser.add_argument("--mongo-uri")
    parser.add_argument("--db")
    parser.add_argument("--collection", default="products")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    inventory_rows = load_json(args.inventory_export)
    mongo_products = load_json(args.mongo_products)
    if isinstance(mongo_products, dict) and "products" in mongo_products:
        mongo_products = mongo_products["products"]

    updated_products, changes, duplicates = sync_products(
        mongo_products,
        inventory_rows,
        args.mkid_source,
    )

    report = {
        "changes_count": len(changes),
        "duplicate_match_keys_count": len(duplicates),
        "changes": changes,
        "duplicates": duplicates,
    }

    if args.updated_products:
        write_json(args.updated_products, updated_products)
    if args.report:
        write_json(args.report, report)

    if args.apply:
        if not args.mongo_uri or not args.db:
            raise SystemExit("--apply requires --mongo-uri and --db")
        apply_to_mongo(args, changes)

    print(f"Matched and prepared {len(changes)} financial updates.")
    if duplicates:
        print(f"Skipped {len(duplicates)} duplicate inventory match keys; see report.")
    if not args.apply:
        print("Dry run only. Re-run with --apply to update MongoDB.")


if __name__ == "__main__":
    main()
