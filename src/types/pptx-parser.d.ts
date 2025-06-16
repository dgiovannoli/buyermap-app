declare module 'pptx-parser' {
  const parse: (buffer: Buffer) => Promise<{ text: string }[]>;
  export default parse;
} 