import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'

export function useMDXComponents(components: Parameters<typeof getDocsMDXComponents>[0] = {}) {
  return getDocsMDXComponents(components)
}
