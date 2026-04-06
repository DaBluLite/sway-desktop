import { useCast, CastProvider } from 'react-castjs'

export const CastContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode
}) => {
  return <CastProvider>{children}</CastProvider>
}

export const useCastContext = () => {
  return useCast()
}
