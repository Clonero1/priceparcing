export function createBatches(items, size) {
  if (!Number.isInteger(size) || size <= 0) throw new Error("Размер пакета должен быть положительным целым числом");
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export function estimateBatchHours(totalItems, workers, secondsPerBatch) {
  if (totalItems <= 0 || workers <= 0 || secondsPerBatch < 0) return 0;
  return (Math.ceil(totalItems / workers) * secondsPerBatch) / 3_600;
}
