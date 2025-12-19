const CLIENT_ID_KEY = 'uq-client-id'

export const getClientId = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }
  
  let clientId = localStorage.getItem(CLIENT_ID_KEY)
  
  if (!clientId) {
    clientId = crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_KEY, clientId)
  }
  
  return clientId
}

