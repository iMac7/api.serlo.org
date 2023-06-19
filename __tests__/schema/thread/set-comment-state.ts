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

import {
  article,
  article2,
  comment,
  comment1,
  comment2,
  comment3,
  user,
  user2,
} from '../../../__fixtures__'
import { Client, given } from '../../__utils__'

const mutation = new Client({ userId: user.id }).prepareQuery({
  query: gql`
    mutation setCommentState($input: ThreadSetCommentStateInput!) {
      thread {
        setCommentState(input: $input) {
          success
        }
      }
    }
  `,
})

beforeEach(() => {
  given('UuidQuery').for(
    article,
    article2,
    comment,
    comment1,
    comment2,
    comment3,
    user,
    user2
  )
})

// TODO: this is actually wrong since the provided comment is a thread
test('trashing any comment as a moderator returns success', async () => {
  given('UuidSetStateMutation')
    .withPayload({ ids: [comment2.id], userId: user.id, trashed: true })
    .returns(undefined)

  await mutation
    .withInput({ id: comment2.id, trashed: true })
    .shouldReturnData({
      thread: { setCommentState: { success: true } },
    })
})

test('trashing own comment returns success', async () => {
  given('UuidSetStateMutation')
    .withPayload({ ids: [comment2.id], userId: user2.id, trashed: true })
    .returns(undefined)

  await mutation
    .withContext({ userId: user2.id })
    .withInput({ id: comment2.id, trashed: true })
    .shouldReturnData({
      thread: { setCommentState: { success: true } },
    })
})

test('trashing the comment from another user returns an error', async () => {
  given('UuidSetStateMutation')
    .withPayload({ ids: [comment3.id], userId: user2.id, trashed: true })
    .returns(undefined)

  await mutation
    .withContext({ userId: user2.id })
    .withInput({ id: comment3.id, trashed: true })
    .shouldFailWithError('FORBIDDEN')
})

test('unauthenticated user gets error', async () => {
  await mutation
    .withInput({ id: comment.id, trashed: true })
    .forUnauthenticatedUser()
    .shouldFailWithError('UNAUTHENTICATED')
})
