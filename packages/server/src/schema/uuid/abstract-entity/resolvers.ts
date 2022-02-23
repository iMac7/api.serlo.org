/**
 * This file is part of Serlo.org API
 *
 * Copyright (c) 2020-2022 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020-2022 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/api.serlo.org for the canonical source repository
 */
import * as serloAuth from '@serlo/authorization'

import { ModelDataSource } from '~/internals/data-source'
import {
  assertUserIsAuthenticated,
  assertUserIsAuthorized,
  createNamespace,
  InterfaceResolvers,
  Mutations,
} from '~/internals/graphql'
import { castToUuid, EntityRevisionType } from '~/model/decoder'
import { fetchScopeOfUuid } from '~/schema/authorization/utils'

export const resolvers: InterfaceResolvers<'AbstractEntity'> &
  InterfaceResolvers<'AbstractEntityRevision'> &
  Mutations<'entity'> = {
  Mutation: {
    entity: createNamespace(),
  },
  AbstractEntity: {
    __resolveType(entity) {
      return entity.__typename
    },
  },
  AbstractEntityRevision: {
    __resolveType(entityRevision) {
      return entityRevision.__typename
    },
  },
  EntityMutation: {
    async addAppletRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.AppletRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addArticleRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.ArticleRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addCourseRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.CourseRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addCoursePageRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.CoursePageRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addEventRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.EventRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addExerciseRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.ExerciseRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addExerciseGroupRevision(
      _parent,
      { input },
      { dataSources, userId }
    ) {
      const cohesive = input.cohesive === true ? 'true' : 'false'
      const transformedInput: Omit<typeof input, 'cohesive'> & {
        cohesive: 'true' | 'false'
      } = { ...input, cohesive }

      return await addRevision({
        revisionType: EntityRevisionType.ExerciseGroupRevision,
        input: transformedInput,
        dataSources,
        userId,
      })
    },
    async addGroupedExerciseRevision(
      _parent,
      { input },
      { dataSources, userId }
    ) {
      return await addRevision({
        revisionType: EntityRevisionType.GroupedExerciseRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addSolutionRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.SolutionRevision,
        input,
        dataSources,
        userId,
      })
    },
    async addVideoRevision(_parent, { input }, { dataSources, userId }) {
      return await addRevision({
        revisionType: EntityRevisionType.VideoRevision,
        input,
        dataSources,
        userId,
      })
    },
    async checkoutRevision(_parent, { input }, { dataSources, userId }) {
      assertUserIsAuthenticated(userId)

      const scope = await fetchScopeOfUuid({
        id: input.revisionId,
        dataSources,
      })
      await assertUserIsAuthorized({
        userId,
        dataSources,
        message: 'You are not allowed to check out the provided revision.',
        guard: serloAuth.Entity.checkoutRevision(scope),
      })

      await dataSources.model.serlo.checkoutEntityRevision({
        revisionId: castToUuid(input.revisionId),
        reason: input.reason,
        userId,
      })

      return { success: true, query: {} }
    },
    async rejectRevision(_parent, { input }, { dataSources, userId }) {
      assertUserIsAuthenticated(userId)

      const scope = await fetchScopeOfUuid({
        id: input.revisionId,
        dataSources,
      })
      await assertUserIsAuthorized({
        userId,
        dataSources,
        message: 'You are not allowed to reject the provided revision.',
        guard: serloAuth.Entity.rejectRevision(scope),
      })

      await dataSources.model.serlo.rejectEntityRevision({ ...input, userId })

      return { success: true, query: {} }
    },
  },
}

interface AbstractEntityAddRevisionPayload {
  revisionType: EntityRevisionType
  input: {
    changes: string
    entityId: number
    needsReview: boolean
    subscribeThis: boolean
    subscribeThisByEmail: boolean
    cohesive?: 'true' | 'false'
    content?: string
    description?: string
    metaDescription?: string
    metaTitle?: string
    title?: string
    url?: string
  }
  dataSources: { model: ModelDataSource }
  userId: number | null
}

async function addRevision({
  revisionType,
  input,
  dataSources,
  userId,
}: AbstractEntityAddRevisionPayload) {
  assertUserIsAuthenticated(userId)

  const { entityId } = input

  const scope = await fetchScopeOfUuid({
    id: entityId,
    dataSources,
  })
  await assertUserIsAuthorized({
    userId,
    dataSources,
    message: 'You are not allowed to add revision to this entity.',
    guard: serloAuth.Uuid.create('EntityRevision')(scope),
  })

  const {
    cohesive,
    content,
    description,
    metaDescription,
    metaTitle,
    title,
    url,
  } = input

  const inputFields: {
    [key: string]: string | undefined
  } = {
    cohesive,
    content,
    description,
    metaDescription,
    metaTitle,
    title,
    url,
  }

  const fields: {
    [key: string]: string
  } = {}

  for (const [key, value] of Object.entries(inputFields)) {
    if (value) {
      fields[key] = value
    }
  }

  const { changes, needsReview, subscribeThis, subscribeThisByEmail } = input
  const inputPayload = {
    changes,
    entityId,
    needsReview,
    subscribeThis,
    subscribeThisByEmail,
    fields,
  }
  await dataSources.model.serlo.addEntityRevision({
    revisionType,
    userId,
    input: inputPayload,
  })

  return { success: true }
}
