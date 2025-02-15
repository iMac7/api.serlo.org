/**
 * This file is part of Serlo.org API
 *
 * Copyright (c) 2020-2023 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2020-2023 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/api.serlo.org for the canonical source repository
 */
import {
  ConnectorClient,
  ConnectorError,
  ConnectorRelationshipChangeStatus,
  ConnectorRelationshipChangeType,
  ConnectorRequestContent,
} from '@nmshd/connector-sdk'
import express, { Express, RequestHandler, Request, Response } from 'express'
import { option as O } from 'fp-ts'
import * as t from 'io-ts'

import { Cache } from '../cache'
import { captureErrorEvent } from '../error-event'

export function applyEnmeshedMiddleware({
  app,
  cache,
}: {
  app: Express
  cache: Cache
}) {
  if (process.env.ENVIRONMENT === 'production') return null

  const basePath = '/enmeshed'
  const client = ConnectorClient.create({
    baseUrl: `${process.env.ENMESHED_SERVER_HOST}`,
    apiKey: `${process.env.ENMESHED_SERVER_SECRET}`,
  })

  app.post(`${basePath}/init`, createEnmeshedInitMiddleware(client, cache))
  app.get(`${basePath}/attributes`, createGetAttributesHandler(cache))
  app.post(`${basePath}/attributes`, createSetAttributesHandler(client, cache))
  app.use(express.json())
  app.post(
    `${basePath}/webhook`,
    createEnmeshedWebhookMiddleware(client, cache),
  )
  return `${basePath}/init`
}

const GenericEventBody = t.type({
  trigger: t.string,
})

const Relationship = t.type({
  id: t.string,
  peer: t.string,
  status: t.string,
  template: t.type({
    id: t.string,
    content: t.partial({
      onNewRelationship: t.partial({
        metadata: t.partial({ sessionId: t.union([t.string, t.null]) }),
      }),
    }),
  }),
  changes: t.array(t.type({ type: t.string, status: t.string, id: t.string })),
})

type Relationship = t.TypeOf<typeof Relationship>

const Attribute = t.type({
  id: t.string,
  content: t.type({
    '@type': t.union([
      t.literal('IdentityAttribute'),
      t.literal('RelationshipAttribute'),
    ]),
    owner: t.string,
    value: t.unknown,
  }),
})

const EventBody = t.type({
  data: t.union([Relationship, Attribute]),
  trigger: t.union([
    t.literal('transport.relationshipChanged'),
    t.literal('consumption.attributeCreated'),
  ]),
})

const Session = t.intersection([
  t.type({ relationshipTemplateId: t.string }),
  t.partial({
    enmeshedId: t.string,
    content: t.UnknownRecord,
  }),
])

type Session = t.TypeOf<typeof Session>

/**
 * Endpoint for enmeshed relationship initialization.
 * Creates relationship template and returns QR for the user to scan.
 */
function createEnmeshedInitMiddleware(
  client: ConnectorClient,
  cache: Cache,
): RequestHandler {
  async function handleRequest(req: Request, res: Response) {
    const sessionId = readQuery(req, 'sessionId')
    // FIXME: Uncomment next line when prototype frontend has been replaced
    // if (!sessionId) return validationError(res, 'Missing required parameter: sessionId.')

    const session = await getSession(cache, sessionId)

    let relationshipTemplateId = ''

    if (session) {
      relationshipTemplateId = session.relationshipTemplateId
    } else {
      const name = readQuery(req, 'name')
      const nameParts = name?.split(' ') ?? []

      const createAttributeResponse = await client.attributes.createAttribute({
        content: {
          '@type': 'IdentityAttribute',
          owner: (await client.account.getIdentityInfo()).result.address,
          value: {
            '@type': 'DisplayName',
            value: 'LENABI Demo',
          },
        },
      })

      if (createAttributeResponse.isError) {
        return handleConnectorError({
          error: createAttributeResponse.error,
          message: 'Error occurred while creating relationship attribute',
          response: res,
        })
      }

      const requestGroup = {
        '@type': 'RequestItemGroup',
        mustBeAccepted: true,
        title: 'Requested Attributes',
        items: [
          {
            '@type': 'CreateAttributeRequestItem',
            mustBeAccepted: true,
            attribute: {
              owner: '',
              key: 'LernstandMathe',
              confidentiality: 'public',
              '@type': 'RelationshipAttribute',
              value: {
                '@type': 'ProprietaryString',
                title: 'LernstandMathe',
                value: '',
              },
            },
          },
        ],
      } as ConnectorRequestContent['items'][number]

      // TODO: Handle privacy See https://github.com/serlo/api.serlo.org/blob/83db29db4a98f6b32c389a0a0f89612fb9f760f8/packages/server/src/internals/server/enmeshed-middleware.ts#L470
      const attributesContent: ConnectorRequestContent = {
        metadata: { sessionId: sessionId },
        items: [
          {
            '@type': 'RequestItemGroup',
            mustBeAccepted: true,
            title: 'Shared Attributes',
            items: [
              {
                '@type': 'ShareAttributeRequestItem',
                mustBeAccepted: true,
                attribute: {
                  '@type': 'IdentityAttribute',
                  owner: '',
                  value: {
                    '@type': 'DisplayName',
                    value: 'LENABI Demo',
                  },
                },
                sourceAttributeId: createAttributeResponse.result.id,
              },
            ],
          },
          ...(nameParts.length > 0 ? [requestGroup] : []),
        ],
      }

      const validationResponse = await client.outgoingRequests.canCreateRequest(
        {
          content: attributesContent,
        },
      )
      if (validationResponse.isError) {
        return handleConnectorError({
          error: validationResponse.error,
          message: 'Error occurred while validating attributes',
          response: res,
        })
      }

      const createRelationshipResponse =
        await client.relationshipTemplates.createOwnRelationshipTemplate({
          expiresAt: '2100-01-01T00:00:00.000Z',
          content: {
            '@type': 'RelationshipTemplateContent',
            title: 'LENABI Demo',
            onNewRelationship: attributesContent,
          },
        })
      if (createRelationshipResponse.isError) {
        return handleConnectorError({
          error: createRelationshipResponse.error,
          message: 'Error occurred while creating relationship',
          response: res,
        })
      }

      relationshipTemplateId = createRelationshipResponse.result.id

      await setSession(cache, sessionId, { relationshipTemplateId })
    }

    const createTokenResponse =
      await client.relationshipTemplates.createTokenQrCodeForOwnRelationshipTemplate(
        relationshipTemplateId,
      )
    if (createTokenResponse.isError) {
      return handleConnectorError({
        error: createTokenResponse.error,
        message: 'Error occurred while creating token',
        response: res,
      })
    }
    res.setHeader('Content-Type', 'image/png')
    res.status(200).end(createTokenResponse.result)
  }

  return (request, response) => {
    handleRequest(request, response).catch((error: Error) => {
      captureErrorEvent({
        error,
        errorContext: { headers: request.headers },
      })
      return response.status(500).send('Internal Server Error')
    })
  }
}

function createGetAttributesHandler(cache: Cache): RequestHandler {
  async function handleRequest(req: Request, res: Response) {
    const sessionId = readQuery(req, 'sessionId')
    if (!sessionId)
      return validationError(res, 'Missing required parameter: sessionId.')
    const session = await getSession(cache, sessionId)

    if (!session)
      return validationError(
        res,
        'Session not found. Please create a QR code first.',
      )
    res.setHeader('Content-Type', 'application/json')
    if (session.content) {
      res.status(200).end(
        JSON.stringify({
          status: 'success',
          attributes: session.content,
        }),
      )
    } else {
      res.status(200).end(JSON.stringify({ status: 'pending' }))
    }
  }
  return (request, response) => {
    handleRequest(request, response).catch((error: Error) => {
      captureErrorEvent({
        error,
        errorContext: { headers: request.headers },
      })
      return response.status(500).send('Internal Server Error')
    })
  }
}

function createSetAttributesHandler(
  client: ConnectorClient,
  cache: Cache,
): RequestHandler {
  async function handleRequest(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/json')

    const sessionId = readQuery(req, 'sessionId')
    if (!sessionId)
      return validationError(res, 'Missing required parameter: sessionId.')
    const session = await getSession(cache, sessionId)
    if (!session)
      return validationError(
        res,
        'Session not found. Please create a QR code first.',
      )
    if (!session.enmeshedId)
      return validationError(res, 'Relationship not accepted yet.')

    const name = readQuery(req, 'name')
    if (!name) return validationError(res, 'Missing required parameter: name.')
    const value = readQuery(req, 'value')
    if (!value)
      return validationError(res, 'Missing required parameter: value.')

    const request = await client.outgoingRequests.createRequest({
      content: {
        items: [
          {
            '@type': 'CreateAttributeRequestItem',
            mustBeAccepted: true,
            attribute: {
              key: name,
              owner: '',
              confidentiality: 'public',
              '@type': 'RelationshipAttribute',
              value: {
                '@type': 'ProprietaryString',
                title: name,
                value: value,
              },
            },
          },
        ],
      },
      peer: session.enmeshedId,
    })

    if (request.isError) {
      return handleConnectorError({
        error: request.error,
        message: 'Failed to create request to change attribute:',
      })
    }

    const sendMessageResponse = await client.messages.sendMessage({
      recipients: [session.enmeshedId],
      content: {
        '@type': 'Mail',
        to: [session.enmeshedId],
        subject: 'Aktualisierung deines Lernstands',
        body: 'Gratulation!\nDu hast den Kurs zum logistischen Wachstum erfolgreich absolviert. Bitte speichere den aktualisierten Lernstand.\nDein Serlo-Team',
      },
    })

    if (sendMessageResponse.isError) {
      return handleConnectorError({
        error: sendMessageResponse.error,
        message: 'Failed to send message:',
      })
    }

    const attributeChangeResponse = await client.messages.sendMessage({
      recipients: [session.enmeshedId],
      content: request.result.content,
    })

    if (attributeChangeResponse.isError) {
      return handleConnectorError({
        error: attributeChangeResponse.error,
        message: 'Failed to send attribute change request:',
      })
    }

    res.status(200).end(JSON.stringify({ status: 'success' }))
  }

  return (request, response) => {
    handleRequest(request, response).catch((error: Error) => {
      captureErrorEvent({
        error,
        errorContext: { headers: request.headers },
      })
      return response.status(500).send('Internal Server Error')
    })
  }
}

/**
 * Endpoint for Connector webhook, which receives any changes within relationships and messages
 */
function createEnmeshedWebhookMiddleware(
  client: ConnectorClient,
  cache: Cache,
): RequestHandler {
  async function handleRequest(req: Request, res: Response) {
    if (req.headers['x-api-key'] !== process.env.ENMESHED_WEBHOOK_SECRET) {
      res.status(400).send('Wrong X-API-Key')
      return
    }

    const body = req.body as unknown

    if (!GenericEventBody.is(body)) {
      res.status(400).send('Illegal trigger body')
      return
    }

    if (
      body.trigger !== 'transport.relationshipChanged' &&
      body.trigger !== 'consumption.attributeCreated'
    ) {
      res.sendStatus(200)
      return
    }

    if (!EventBody.is(body)) {
      captureErrorEvent({
        error: new Error('Illegal body event'),
        errorContext: { body, route: '/enmeshed/webhook' },
      })
      res.status(400).send('Illegal trigger body')
      return
    }

    const data = body.data

    if (Relationship.is(data)) {
      const sessionId =
        data.template.content?.onNewRelationship?.metadata?.sessionId ?? null

      for (const change of data.changes) {
        if (
          [ConnectorRelationshipChangeType.CREATION as string].includes(
            change.type,
          ) &&
          [
            ConnectorRelationshipChangeStatus.PENDING as string,
            ConnectorRelationshipChangeStatus.REJECTED as string,
          ].includes(change.status)
        ) {
          await acceptRelationshipRequest(data, change, client)
          if (!sessionId) {
            await sendWelcomeMessage({ relationship: data, client })
            await sendAttributesChangeRequest({ relationship: data, client })
          }
        }
      }

      // FIXME: Uncomment next line when prototype frontend has been replaced
      // if (!sessionId) return validationError(res, 'Missing required parameter: sessionId.')
      const session = await getSession(cache, sessionId)

      if (session) {
        await setSession(cache, sessionId, {
          relationshipTemplateId: data.template.id,
          enmeshedId: data.peer,
          content: data.template.content as Session['content'],
        })
      }
    }

    res.status(200).end('')
  }

  return (request, response) => {
    handleRequest(request, response).catch((error: Error) => {
      captureErrorEvent({
        error,
        errorContext: { headers: request.headers },
      })
      return response.status(500).send('Internal Server Error')
    })
  }
}

/**
 * Accepts pending relationship request
 */
async function acceptRelationshipRequest(
  relationship: Relationship,
  change: { id: string },
  client: ConnectorClient,
): Promise<void> {
  const acceptRelationshipResponse =
    await client.relationships.acceptRelationshipChange(
      relationship.id,
      change.id,
    )
  if (acceptRelationshipResponse.isError) {
    handleConnectorError({
      error: acceptRelationshipResponse.error,
      message: 'Failed while accepting relationship request',
    })
  }
}

/**
 * Sends a welcome message with a test file attachment to be saved within the users' data wallet
 */
async function sendWelcomeMessage({
  relationship,
  client,
}: {
  relationship: Relationship
  client: ConnectorClient
}): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)
  const uploadFileResponse = await client.files.uploadOwnFile({
    title: 'Serlo Testdatei',
    description: 'Test file created by Serlo',
    file: Buffer.from(
      '<html><head><title>Serlo Testdatei</title></head><body><p>Hello World! - Dies ist eine Testdatei.</p></body></html>',
    ),
    filename: 'serlo-test.html',
    expiresAt: expiresAt.toISOString(),
  })

  if (uploadFileResponse.isError) {
    handleConnectorError({
      error: uploadFileResponse.error,
      message: 'Failed to upload file in welcome message',
    })
  }

  const sendMessageResponse = await client.messages.sendMessage({
    recipients: [relationship.peer],
    content: {
      '@type': 'Mail',
      to: [relationship.peer],
      subject: 'Danke für dein Vertrauen.',
      body: 'Hallo!\nDanke für deine Anfrage, wir freuen uns über dein Vertrauen.\nDein Serlo-Team',
    },
    attachments: [uploadFileResponse.result.id],
  })

  if (sendMessageResponse.isError) {
    handleConnectorError({
      error: sendMessageResponse.error,
      message: 'Failed to upload file in welcome message',
    })
  }
}

/**
 * Requests user to change and share attributes in data wallet
 * Attributes will be sent to connector webhook after confirmation
 */
async function sendAttributesChangeRequest({
  relationship,
  client,
}: {
  relationship: Relationship
  client: ConnectorClient
}): Promise<void> {
  const request = await client.outgoingRequests.createRequest({
    content: {
      items: [
        {
          '@type': 'CreateAttributeRequestItem',
          mustBeAccepted: true,
          attribute: {
            key: 'LernstandMathe',
            owner: '',
            confidentiality: 'public',
            '@type': 'RelationshipAttribute',
            value: {
              '@type': 'ProprietaryString',
              title: 'LernstandMathe',
              value: '42',
            },
          },
        },
      ],
    },
    peer: relationship.peer,
  })

  if (request.isError) {
    handleConnectorError({
      error: request.error,
      message: 'Failed to create request to change attribute:',
    })
  }

  const sendMailResponse = await client.messages.sendMessage({
    recipients: [relationship.peer],
    content: {
      '@type': 'Mail',
      to: [relationship.peer],
      subject: 'Dein Lernstand',
      body: 'Hallo!\nBitte speichere deinen aktuellen Lernstand.\nDein Serlo-Team',
    },
  })

  if (sendMailResponse.isError) {
    handleConnectorError({
      error: sendMailResponse.error,
      message: 'Failed to send mail',
    })
  }

  const attributeChangeResponse = await client.messages.sendMessage({
    recipients: [relationship.peer],
    content: request.result.content,
  })

  if (attributeChangeResponse.isError) {
    handleConnectorError({
      error: attributeChangeResponse.error,
      message: 'Failed to send attribute change request:',
    })
  }
}

function handleConnectorError({
  error,
  message,
  response,
}: {
  error: ConnectorError
  message: string
  response?: Response
}) {
  const log = `${message}: ${error.code} ${error.message}`
  if (response) {
    return response.status(500).end(log)
  } else {
    captureErrorEvent({
      error: new Error(log),
      errorContext: { error },
    })
  }
}

function validationError(res: Response, message: string) {
  res.statusCode = 400
  res.end(
    JSON.stringify({
      status: 'error',
      message,
    }),
  )
}

async function getSession(
  cache: Cache,
  sessionId: string | null,
): Promise<Session | null> {
  const cachedValue = await cache.get({ key: getSessionKey(sessionId) })

  if (!O.isNone(cachedValue)) {
    if (Session.is(cachedValue.value.value)) {
      return cachedValue.value.value
    }
  }

  return null
}

async function setSession(
  cache: Cache,
  sessionId: string | null,
  session: Session,
) {
  await cache.set({
    key: getSessionKey(sessionId),
    value: session,
    ttlInSeconds: 20 * 60,
    source: 'enmeshed-middleware',
  })
  if (session.enmeshedId) {
    await cache.set({
      key: getIdentityKey(session.enmeshedId),
      value: sessionId,
      ttlInSeconds: 20 * 60,
      source: 'enmeshed-middleware',
    })
  }
}

function getSessionKey(sessionId: string | null) {
  return sessionId
    ? `enmeshed:${sessionId}`
    : 'de.serlo.org/api/enmeshed/relationship-template-id'
}

function getIdentityKey(id: string) {
  return `enmeshed:${id}`
}

function readQuery(req: ExpressRequest, key: string): string | null {
  const value = req.query[key]

  return typeof value === 'string' ? value : null
}

type ExpressRequest = Parameters<RequestHandler>[0]
