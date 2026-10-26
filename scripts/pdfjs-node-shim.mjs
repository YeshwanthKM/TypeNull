export const GlobalWorkerOptions = { workerSrc: '' };
export const version = '3.11.174';
export function getDocument() {
  return {
    promise: Promise.resolve({
      numPages: 0,
      getPage: () => Promise.resolve({
        getTextContent: () => Promise.resolve({ items: [] }),
        getViewport: () => ({ width: 612, height: 792 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
  };
}
