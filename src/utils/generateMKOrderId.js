const generateMKOrderId = () =>
  Number(`${Date.now()}${Math.floor(Math.random() * 90 + 10)}`);

export default generateMKOrderId;