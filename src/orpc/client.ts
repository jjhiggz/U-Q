import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import router from './router'
import type { RouterClient } from '@orpc/server'

const link = new RPCLink({
  url: '/api/rpc',
})

export const client: RouterClient<typeof router> = createORPCClient(link)

