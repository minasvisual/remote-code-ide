export default {}
export const editor = {
  getModel: () => null,
  createModel: () => ({ dispose: () => {} }),
  createDiffEditor: () => ({
    setModel: () => {},
    dispose: () => {},
  }),
}
export const Uri = {
  parse: (s: string) => ({ toString: () => s }),
}
export const KeyMod = { CtrlCmd: 0 }
export const KeyCode = { KeyS: 0 }
