export default {}
export const editor = {
  getModel: () => null,
  createModel: () => ({}),
}
export const Uri = {
  parse: (s: string) => ({ toString: () => s }),
}
export const KeyMod = { CtrlCmd: 0 }
export const KeyCode = { KeyS: 0 }
