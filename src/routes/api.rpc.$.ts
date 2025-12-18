import { createFileRoute } from '@tanstack/react-router'
import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import router from '@/orpc/router'

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

async function handleRequest({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: {},
  })

  return response ?? new Response('Not found', { status: 404 })
}

export const Route = createFileRoute('/api/rpc/$')({
  server: {
    handlers: {
      HEAD: handleRequest,
      GET: handleRequest,
      POST: handleRequest,
      PUT: handleRequest,
      PATCH: handleRequest,
      DELETE: handleRequest,
    },
  },
})
