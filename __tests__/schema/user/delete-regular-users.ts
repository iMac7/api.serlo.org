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
import { gql } from 'apollo-server'
import * as R from 'ramda'

import { user as baseUser } from '../../../__fixtures__'
import { Client, given, nextUuid, Query } from '../../__utils__'

let client: Client
let mutation: Query

const user = { ...baseUser, roles: ['sysadmin'] }
const users = [user, { ...user, username: 'foo', id: nextUuid(user.id) }]
const noUserId = nextUuid(nextUuid(user.id))

beforeEach(() => {
  client = new Client({ userId: user.id })

  mutation = client
    .prepareQuery({
      query: gql`
        mutation ($input: UserDeleteRegularUsersInput!) {
          user {
            deleteRegularUsers(input: $input) {
              success
              username
              reason
            }
          }
        }
      `,
    })
    .withInput({ users: users.map(R.pick(['id', 'username'])) })

  given('UserDeleteRegularUsersMutation').isDefinedBy((req, res, ctx) => {
    const { userId } = req.body.payload

    given('UuidQuery').withPayload({ id: userId }).returnsNotFound()

    return res(ctx.json({ success: true }))
  })

  given('UuidQuery').for(users)
})

test('runs successfully when mutation could be successfully executed', async () => {
  expect(global.kratos.identities).toHaveLength(users.length)

  await mutation.shouldReturnData({
    user: {
      deleteRegularUsers: [
        { success: true, username: user.username, reason: null },
        { success: true, username: 'foo', reason: null },
      ],
    },
  })
  expect(global.kratos.identities).toHaveLength(users.length - 2)
})

test('runs partially when one of the mutations failed', async () => {
  given('UserDeleteRegularUsersMutation').isDefinedBy((req, res, ctx) => {
    const { userId } = req.body.payload

    if (userId === user.id)
      return res(ctx.json({ success: false, reason: 'failure!' }))

    given('UuidQuery').withPayload({ id: userId }).returnsNotFound()

    return res(ctx.json({ success: true }))
  })

  expect(global.kratos.identities).toHaveLength(users.length)

  await mutation.shouldReturnData({
    user: {
      deleteRegularUsers: [
        { success: false, username: user.username, reason: 'failure!' },
        { success: true, username: 'foo', reason: null },
      ],
    },
  })
  expect(global.kratos.identities).toHaveLength(users.length - 1)
})

test('fails when username does not match user', async () => {
  await mutation
    .withInput({ users: [{ id: user.id, username: 'something' }] })
    .shouldFailWithError('BAD_USER_INPUT')
})

test('updates the cache', async () => {
  const uuidQuery = client
    .prepareQuery({
      query: gql`
        query ($id: Int!) {
          uuid(id: $id) {
            id
          }
        }
      `,
    })
    .withVariables({ id: user.id })

  await uuidQuery.shouldReturnData({ uuid: { id: user.id } })

  await mutation.execute()

  await uuidQuery.shouldReturnData({ uuid: null })
})

test('fails when one of the given bot ids is not a user', async () => {
  await mutation
    .withInput({ userIds: [noUserId] })
    .shouldFailWithError('BAD_USER_INPUT')
})

test('fails when user is not authenticated', async () => {
  await mutation.forUnauthenticatedUser().shouldFailWithError('UNAUTHENTICATED')
})

test('fails when user does not have role "sysadmin"', async () => {
  await mutation.forLoginUser('de_admin').shouldFailWithError('FORBIDDEN')
})

test('fails when database layer has an internal error', async () => {
  given('UserDeleteRegularUsersMutation').hasInternalServerError()

  await mutation.shouldFailWithError('INTERNAL_SERVER_ERROR')

  expect(global.kratos.identities).toHaveLength(users.length)
})

test('fails when kratos has an error', async () => {
  global.kratos.admin.deleteIdentity = () => {
    throw new Error('Error in kratos')
  }

  await mutation.shouldFailWithError('INTERNAL_SERVER_ERROR')
})
