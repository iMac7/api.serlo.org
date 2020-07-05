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
import { generateChangelog } from '@splish-me/changelog'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

const writeFile = util.promisify(fs.writeFile)

exec()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

async function exec(): Promise<void> {
  const content = await generateChangelog([
    {
      tagName: 'v0.1.0',
      name: '0.1.0',
      date: '2020-04-10',
      description: 'Initial release',
    },
    {
      tagName: 'v0.1.1',
      name: '0.1.1',
      date: '2020-04-11',
      added: ['Add health check route `/`.'],
      fixed: ['Lazily create token for GraphQL playground.'],
    },
    {
      tagName: 'v0.2.0',
      name: '0.2.0',
      date: '2020-04-13',
      breakingChanges: [
        "Remove health check route `/`. Use Apollo's health check route `.well-known/apollo/server-health` instead.",
      ],
      added: ['Add descriptions to the GraphQL schema.'],
    },
    {
      tagName: 'v0.3.0',
      name: '0.3.0',
      date: '2020-04-15',
      added: [
        'Add entity types `Course` and `CoursePage`.',
        'Add entity types `ExerciseGroup`, `GroupedExercise`, `Exercise`, and `Solution`.',
        'Add entity type `Applet`.',
        'Add entity type `Event`.',
        'Add entity type `Video`.',
      ],
    },
    {
      tagName: 'v0.4.0',
      name: '0.4.0',
      date: '2020-04-24',
      breakingChanges: [
        'Remove path from `TaxonomyTerm`. Use `TaxonomyTerm.navigation.path` instead.',
      ],
      added: [
        'Add `navigation` to `Page` and `TaxonomyTerm`',
        'Add meta fields to `EntityRevision`',
        'Add `content` to `VideoRevision`',
      ],
    },
    {
      tagName: 'v0.4.1',
      name: '0.4.1',
      date: '2020-04-24',
      fixed: ['Fix build'],
    },
    {
      tagName: 'v0.4.2',
      name: '0.4.2',
      date: '2020-04-24',
      fixed: ['Fix build'],
    },
    {
      tagName: 'v0.4.3',
      name: '0.4.3',
      date: '2020-04-27',
      fixed: ['Fix `navigation.data`'],
    },
    {
      tagName: 'v0.5.0',
      name: '0.5.0',
      date: '2020-04-27',
      breakingChanges: ['Use Redis as cache', 'Use MessagePack as serializer'],
    },
    {
      tagName: 'v0.5.1',
      name: '0.5.1',
      date: '2020-06-05',
      added: ['Handle user tokens'],
      fixed: ['Output url-encoded aliases'],
    },
    {
      tagName: 'v0.5.2',
      name: '0.5.2',
      date: '2020-06-05',
      fixed: ['Handle url-encoded alias inputs correctly'],
    },
    {
      tagName: 'v0.5.3',
      name: '0.5.3',
      date: '2020-07-06',
      fixed: ['Fix navigation contract tests'],
    },
  ])

  await writeFile(path.join(__dirname, '..', 'CHANGELOG.md'), content)
}
