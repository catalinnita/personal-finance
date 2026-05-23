import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'

export function useMDXComponents(components?: object) {
  return getDocsMDXComponents(components)
}
