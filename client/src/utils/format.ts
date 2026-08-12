export const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const formatOrderStatus = (status: string) => status.replaceAll('_', ' ')
