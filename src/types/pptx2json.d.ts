declare module 'pptx2json' {
  const parse: (buffer: Buffer) => Promise<{ text: string }[]>;
  export default parse;
} 