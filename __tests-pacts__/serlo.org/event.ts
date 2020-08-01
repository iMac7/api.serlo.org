/**
 * This file is part of Serlo.org API
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/api.serlo.org for the canonical source repository
 */
import { Matchers } from '@pact-foundation/pact'
import { gql } from 'apollo-server'

import {
  checkoutRevisionNotificationEvent,
  createCommentNotificationEvent,
  createEntityLinkNotificationEvent,
  createEntityNotificationEvent,
  createEntityRevisionNotificationEvent,
  createTaxonomyLinkNotificationEvent,
  createTaxonomyTermNotificationEvent,
  createThreadNotificationEvent,
  getCheckoutRevisionNotificationEventDataWithoutSubResolvers,
  getCreateCommentNotificationEventDataWithoutSubResolvers,
  getCreateEntityLinkNotificationEventDataWithoutSubResolvers,
  getCreateEntityNotificationEventDataWithoutSubResolvers,
  getCreateEntityRevisionNotificationEventDataWithoutSubResolvers,
  getCreateTaxonomyLinkNotificationEventDataWithoutSubResolvers,
  getCreateTaxonomyTermNotificationEventDataWithoutSubResolvers,
  getCreateThreadNotificationEventDataWithoutSubResolvers,
  getRejectRevisionNotificationEventDataWithoutSubResolvers,
  getRemoveEntityLinkNotificationEventDataWithoutSubResolvers,
  getRemoveTaxonomyLinkNotificationEventDataWithoutSubResolvers,
  getSetLicenseNotificationEventDataWithoutSubResolvers,
  getSetTaxonomyTermNotificationEventDataWithoutSubResolvers,
  getSetThreadStateNotificationEventDataWithoutSubResolvers,
  rejectRevisionNotificationEvent,
  removeEntityLinkNotificationEvent,
  removeTaxonomyLinkNotificationEvent,
  setLicenseNotificationEvent,
  setTaxonomyTermNotificationEvent,
  setThreadStateNotificationEvent,
} from '../../__fixtures__'
import { AbstractNotificationEventPayload } from '../../src/graphql/schema/notification'
import { addJsonInteraction, assertSuccessfulGraphQLQuery } from '../__utils__'

async function addNotificationEventInteraction<
  T extends Pick<AbstractNotificationEventPayload, '__typename' | 'id'>
>(body: T) {
  await addJsonInteraction({
    name: `fetch data of event with id ${body.id}`,
    given: `event ${body.id} is of type ${body.__typename}`,
    path: `/api/event/${body.id}`,
    body,
  })
}

test('CheckoutRevisionNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: checkoutRevisionNotificationEvent.__typename,
    id: checkoutRevisionNotificationEvent.id,
    instance: Matchers.string(checkoutRevisionNotificationEvent.instance),
    date: Matchers.iso8601DateTime(checkoutRevisionNotificationEvent.date),
    reviewerId: Matchers.integer(checkoutRevisionNotificationEvent.reviewerId),
    repositoryId: Matchers.integer(
      checkoutRevisionNotificationEvent.repositoryId
    ),
    revisionId: Matchers.integer(checkoutRevisionNotificationEvent.revisionId),
    reason: Matchers.string(checkoutRevisionNotificationEvent.reason),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CheckoutRevisionNotificationEvent {
            id
            instance
            date
            reason
          }
        }
      }
    `,
    variables: checkoutRevisionNotificationEvent,
    data: {
      notificationEvent: getCheckoutRevisionNotificationEventDataWithoutSubResolvers(
        checkoutRevisionNotificationEvent
      ),
    },
  })
})

test('RejectRevisionNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: rejectRevisionNotificationEvent.__typename,
    id: rejectRevisionNotificationEvent.id,
    instance: Matchers.string(rejectRevisionNotificationEvent.instance),
    date: Matchers.iso8601DateTime(rejectRevisionNotificationEvent.date),
    reviewerId: Matchers.integer(rejectRevisionNotificationEvent.reviewerId),
    repositoryId: Matchers.integer(
      rejectRevisionNotificationEvent.repositoryId
    ),
    revisionId: Matchers.integer(rejectRevisionNotificationEvent.revisionId),
    reason: Matchers.string(rejectRevisionNotificationEvent.reason),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on RejectRevisionNotificationEvent {
            id
            instance
            date
            reason
          }
        }
      }
    `,
    variables: rejectRevisionNotificationEvent,
    data: {
      notificationEvent: getRejectRevisionNotificationEventDataWithoutSubResolvers(
        rejectRevisionNotificationEvent
      ),
    },
  })
})

test('CreateCommentNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createCommentNotificationEvent.__typename,
    id: createCommentNotificationEvent.id,
    instance: Matchers.string(createCommentNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createCommentNotificationEvent.date),
    authorId: Matchers.integer(createCommentNotificationEvent.authorId),
    threadId: Matchers.integer(createCommentNotificationEvent.threadId),
    commentId: Matchers.integer(createCommentNotificationEvent.commentId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateCommentNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createCommentNotificationEvent,
    data: {
      notificationEvent: getCreateCommentNotificationEventDataWithoutSubResolvers(
        createCommentNotificationEvent
      ),
    },
  })
})

test('CreateEntityNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createEntityNotificationEvent.__typename,
    id: createEntityNotificationEvent.id,
    instance: Matchers.string(createEntityNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createEntityNotificationEvent.date),
    authorId: Matchers.integer(createEntityNotificationEvent.authorId),
    entityId: Matchers.integer(createEntityNotificationEvent.entityId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateEntityNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createEntityNotificationEvent,
    data: {
      notificationEvent: getCreateEntityNotificationEventDataWithoutSubResolvers(
        createEntityNotificationEvent
      ),
    },
  })
})

test('CreateEntityLinkNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createEntityLinkNotificationEvent.__typename,
    id: createEntityLinkNotificationEvent.id,
    instance: Matchers.string(createEntityLinkNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createEntityLinkNotificationEvent.date),
    actorId: Matchers.integer(createEntityLinkNotificationEvent.actorId),
    parentId: Matchers.integer(createEntityLinkNotificationEvent.parentId),
    childId: Matchers.integer(createEntityLinkNotificationEvent.childId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateEntityLinkNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createEntityLinkNotificationEvent,
    data: {
      notificationEvent: getCreateEntityLinkNotificationEventDataWithoutSubResolvers(
        createEntityLinkNotificationEvent
      ),
    },
  })
})

test('RemoveEntityLinkNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: removeEntityLinkNotificationEvent.__typename,
    id: removeEntityLinkNotificationEvent.id,
    instance: Matchers.string(removeEntityLinkNotificationEvent.instance),
    date: Matchers.iso8601DateTime(removeEntityLinkNotificationEvent.date),
    actorId: Matchers.integer(removeEntityLinkNotificationEvent.actorId),
    parentId: Matchers.integer(removeEntityLinkNotificationEvent.parentId),
    childId: Matchers.integer(removeEntityLinkNotificationEvent.childId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on RemoveEntityLinkNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: removeEntityLinkNotificationEvent,
    data: {
      notificationEvent: getRemoveEntityLinkNotificationEventDataWithoutSubResolvers(
        removeEntityLinkNotificationEvent
      ),
    },
  })
})

test('CreateEntityRevisionNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createEntityRevisionNotificationEvent.__typename,
    id: createEntityRevisionNotificationEvent.id,
    instance: Matchers.string(createEntityRevisionNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createEntityRevisionNotificationEvent.date),
    authorId: Matchers.integer(createEntityRevisionNotificationEvent.authorId),
    entityId: Matchers.integer(createEntityRevisionNotificationEvent.entityId),
    entityRevisionId: Matchers.integer(
      createEntityRevisionNotificationEvent.entityRevisionId
    ),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateEntityRevisionNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createEntityRevisionNotificationEvent,
    data: {
      notificationEvent: getCreateEntityRevisionNotificationEventDataWithoutSubResolvers(
        createEntityRevisionNotificationEvent
      ),
    },
  })
})

test('CreateTaxonomyTermNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createTaxonomyTermNotificationEvent.__typename,
    id: createTaxonomyTermNotificationEvent.id,
    instance: Matchers.string(createTaxonomyTermNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createTaxonomyTermNotificationEvent.date),
    authorId: Matchers.integer(createTaxonomyTermNotificationEvent.authorId),
    taxonomyTermId: Matchers.integer(
      createTaxonomyTermNotificationEvent.taxonomyTermId
    ),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateTaxonomyTermNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createTaxonomyTermNotificationEvent,
    data: {
      notificationEvent: getCreateTaxonomyTermNotificationEventDataWithoutSubResolvers(
        createTaxonomyTermNotificationEvent
      ),
    },
  })
})

test('SetTaxonomyTermNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: setTaxonomyTermNotificationEvent.__typename,
    id: setTaxonomyTermNotificationEvent.id,
    instance: Matchers.string(setTaxonomyTermNotificationEvent.instance),
    date: Matchers.iso8601DateTime(setTaxonomyTermNotificationEvent.date),
    authorId: Matchers.integer(setTaxonomyTermNotificationEvent.authorId),
    taxonomyTermId: Matchers.integer(
      setTaxonomyTermNotificationEvent.taxonomyTermId
    ),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on SetTaxonomyTermNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: setTaxonomyTermNotificationEvent,
    data: {
      notificationEvent: getSetTaxonomyTermNotificationEventDataWithoutSubResolvers(
        setTaxonomyTermNotificationEvent
      ),
    },
  })
})

test('CreateTaxonomyLinkNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createTaxonomyLinkNotificationEvent.__typename,
    id: createTaxonomyLinkNotificationEvent.id,
    instance: Matchers.string(createTaxonomyLinkNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createTaxonomyLinkNotificationEvent.date),
    actorId: Matchers.integer(createTaxonomyLinkNotificationEvent.actorId),
    parentId: Matchers.integer(createTaxonomyLinkNotificationEvent.parentId),
    childId: Matchers.integer(createTaxonomyLinkNotificationEvent.childId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateTaxonomyLinkNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createTaxonomyLinkNotificationEvent,
    data: {
      notificationEvent: getCreateTaxonomyLinkNotificationEventDataWithoutSubResolvers(
        createTaxonomyLinkNotificationEvent
      ),
    },
  })
})

test('RemoveTaxonomyLinkNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: removeTaxonomyLinkNotificationEvent.__typename,
    id: removeTaxonomyLinkNotificationEvent.id,
    instance: Matchers.string(removeTaxonomyLinkNotificationEvent.instance),
    date: Matchers.iso8601DateTime(removeTaxonomyLinkNotificationEvent.date),
    actorId: Matchers.integer(removeTaxonomyLinkNotificationEvent.actorId),
    parentId: Matchers.integer(removeTaxonomyLinkNotificationEvent.parentId),
    childId: Matchers.integer(removeTaxonomyLinkNotificationEvent.childId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on RemoveTaxonomyLinkNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: removeTaxonomyLinkNotificationEvent,
    data: {
      notificationEvent: getRemoveTaxonomyLinkNotificationEventDataWithoutSubResolvers(
        removeTaxonomyLinkNotificationEvent
      ),
    },
  })
})

test('CreateThreadNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: createThreadNotificationEvent.__typename,
    id: createThreadNotificationEvent.id,
    instance: Matchers.string(createThreadNotificationEvent.instance),
    date: Matchers.iso8601DateTime(createThreadNotificationEvent.date),
    authorId: Matchers.integer(createThreadNotificationEvent.authorId),
    objectId: Matchers.integer(createThreadNotificationEvent.objectId),
    threadId: Matchers.integer(createThreadNotificationEvent.threadId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on CreateThreadNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: createThreadNotificationEvent,
    data: {
      notificationEvent: getCreateThreadNotificationEventDataWithoutSubResolvers(
        createThreadNotificationEvent
      ),
    },
  })
})

test('SetLicenseNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: setLicenseNotificationEvent.__typename,
    id: setLicenseNotificationEvent.id,
    instance: Matchers.string(setLicenseNotificationEvent.instance),
    date: Matchers.iso8601DateTime(setLicenseNotificationEvent.date),
    actorId: Matchers.integer(setLicenseNotificationEvent.actorId),
    repositoryId: Matchers.integer(setLicenseNotificationEvent.repositoryId),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on SetLicenseNotificationEvent {
            id
            instance
            date
          }
        }
      }
    `,
    variables: setLicenseNotificationEvent,
    data: {
      notificationEvent: getSetLicenseNotificationEventDataWithoutSubResolvers(
        setLicenseNotificationEvent
      ),
    },
  })
})

test('SetThreadStateNotificationEvent', async () => {
  await addNotificationEventInteraction({
    __typename: setThreadStateNotificationEvent.__typename,
    id: setThreadStateNotificationEvent.id,
    instance: Matchers.string(setThreadStateNotificationEvent.instance),
    date: Matchers.iso8601DateTime(setThreadStateNotificationEvent.date),
    actorId: Matchers.integer(setThreadStateNotificationEvent.actorId),
    threadId: Matchers.integer(setThreadStateNotificationEvent.threadId),
    archived: Matchers.boolean(setThreadStateNotificationEvent.archived),
  })
  await assertSuccessfulGraphQLQuery({
    query: gql`
      query notificationEvent($id: Int!) {
        notificationEvent(id: $id) {
          __typename
          ... on SetThreadStateNotificationEvent {
            id
            instance
            date
            archived
          }
        }
      }
    `,
    variables: setThreadStateNotificationEvent,
    data: {
      notificationEvent: getSetThreadStateNotificationEventDataWithoutSubResolvers(
        setThreadStateNotificationEvent
      ),
    },
  })
})
