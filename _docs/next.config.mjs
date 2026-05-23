import nextra from 'nextra'

const withNextra = nextra({ theme: 'nextra-theme-docs' })

export default withNextra({
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
})
