Parse.Cloud.define('runBenchmarkTests', async () => {
    const nameGen = () => Math.floor(Math.random() * 100000000)

    // cleanup
    const cleanupOldData = async () => {
        const deleteObjs = await Promise.all([
            new Parse.Query('BookId').limit(10000).find(),
            new Parse.Query('BookPointer').limit(10000).find(),
            new Parse.Query('BookRelation').limit(10000).find(),
            new Parse.Query('ChapterId').limit(10000).find(),
            new Parse.Query('ChapterPointer').limit(10000).find(),
            new Parse.Query('ChapterRelation').limit(10000).find(),
        ])

        const deleteTimeStart = new Date().getTime()
        await Parse.Object.destroyAll(deleteObjs.reduce((arr, objs) => [ ...arr, ...objs ], [] as Parse.Object[]))
        const deleteTime = new Date().getTime() - deleteTimeStart

        return deleteTime
    }

    // create test data
    const createTestData = async (bookCount: number, chaptersPerBook: number) => {
        const unsavedChapterPointers = [ ...Array(bookCount * chaptersPerBook) ]
            .map(() => new Parse.Object('ChapterPointer', {
                name: nameGen(),
            }))

        const unsavedBookPointers = [ ...Array(bookCount) ].map((v, i) => new Parse.Object('BookPointer', {
            name: nameGen(),
            chapters: unsavedChapterPointers.slice(i * chaptersPerBook, chaptersPerBook + (i * chaptersPerBook)),
        }))

        const pointerSaveTimeStart = new Date().getTime()
        await Parse.Object.saveAll(unsavedChapterPointers)
        await Parse.Object.saveAll(unsavedBookPointers)
        const pointerSaveTime = new Date().getTime() - pointerSaveTimeStart

        const unsavedChapterIds = [ ...Array(bookCount * chaptersPerBook) ].map(() => new Parse.Object('ChapterId', {
            name: nameGen(),
        }))
        const idSaveTimeStart = new Date().getTime()
        const chapterIds = await Parse.Object.saveAll(unsavedChapterIds)
        const unsavedBookIds = [ ...Array(bookCount) ].map((v, i) => new Parse.Object('BookId', {
            name: nameGen(),
            chapters: chapterIds.slice(i * chaptersPerBook, chaptersPerBook + (i * chaptersPerBook)).map(o => o.id),
        }))
        await Parse.Object.saveAll(unsavedBookIds)
        const idSaveTime = new Date().getTime() - idSaveTimeStart

        const unsavedChapterRelations = [ ...Array(bookCount * chaptersPerBook) ]
            .map(() => new Parse.Object('ChapterRelation', {
                name: nameGen(),
            }))
        const relationSaveTimeStart = new Date().getTime()
        const chapterRelations = await Parse.Object.saveAll(unsavedChapterRelations)

        const unsavedBookRelations = [ ...Array(bookCount) ].map(() => new Parse.Object('BookRelation', {
            name: nameGen(),
        }))
        unsavedBookRelations.forEach((b, i) => {
            const chapterRelation = b.relation('chapters')
            chapterRelation.add(chapterRelations.slice(i * chaptersPerBook, chaptersPerBook + (i * chaptersPerBook)))
        })
        await Parse.Object.saveAll(unsavedBookRelations)
        const relationSaveTime = new Date().getTime() - relationSaveTimeStart

        return {
            idSaveTime,
            relationSaveTime,
            pointerSaveTime,
        }
    }

    // average tests
    const averageTests = async (trials: number, test: () => Promise<{ [key: string]: number }>) => {
        const trialResults = []
        for (let i = 0; i < trials; i++) {
            trialResults.push(await test())
        }

        const results = trialResults.reduce((accum, r) => {
            const timeLabels = Object.keys(r),
                newAccum = accum

            timeLabels.forEach(l => {
                if (l in newAccum) {
                    newAccum[l].push(r[l])
                }
                else {
                    newAccum[l] = [ r[l] ]
                }
            })

            return newAccum
        }, {} as { [key: string]: number[] })

        const resultAvgs = Object.entries(results)
            .reduce((accum, r) => {
                const [ k, times ] = r

                return {
                    [k]: Math.floor(times.reduce((p, c) => p + c, 0) / times.length) / 1000,
                    ...accum,
                }
            }, {} as { [key: string]: number })

        return resultAvgs
    }

    // array of pointers
    const pointerArrayBenchmark = async () => {
        const chapter = await new Parse.Query('ChapterPointer').first()
        const book = await new Parse.Query('BookPointer').first()

        const fetchBookTimeStart = new Date().getTime()
        await new Parse.Query('BookPointer').equalTo('chapters', chapter).find()
        const fetchBookTime = new Date().getTime() - fetchBookTimeStart

        const fetchChaptersForBookTimeStart = new Date().getTime()
        await new Parse.Query('BookPointer').equalTo('objectId', book && book.id).include('chapters').find()
        const fetchChaptersForBookTime = new Date().getTime() - fetchChaptersForBookTimeStart

        return {
            fetchBookTime,
            fetchChaptersForBookTime,
        }
    }

    // array of string IDs
    const idArrayBenchmark = async () => {
        const chapter = await new Parse.Query('ChapterId').first()
        const book = await new Parse.Query('BookId').first()
        
        const fetchBookTimeStart = new Date().getTime()
        await new Parse.Query('BookId').contains('chapters', chapter && chapter.id || '').find()
        const fetchBookTime = new Date().getTime() - fetchBookTimeStart

        const fetchChaptersForBookTimeStart = new Date().getTime()
        await new Parse.Query('ChapterId').containedIn('objectId', book && book.get('chapters')).find()
        const fetchChaptersForBookTime = new Date().getTime() - fetchChaptersForBookTimeStart

        return {
            fetchBookTime,
            fetchChaptersForBookTime,
        }
    }

    // parse relations
    const relationBenchmark = async () => {
        const chapter = await new Parse.Query('ChapterRelation').first()
        const book = await new Parse.Query('BookRelation').first()

        const fetchBookTimeStart = new Date().getTime()
        await new Parse.Query('BookRelation').equalTo('chapters', chapter).find()
        const fetchBookTime = new Date().getTime() - fetchBookTimeStart

        const fetchChaptersForBookTimeStart = new Date().getTime()
        book && await book.relation('chapters').query().find()
        const fetchChaptersForBookTime = new Date().getTime() - fetchChaptersForBookTimeStart

        return {
            fetchBookTime,
            fetchChaptersForBookTime,
        }
    }


    const trialRuns = 5

    return {
        '100b, 10c': {
            time: await createTestData(100, 10),
            'pointerArrayBenchmark': await averageTests(trialRuns, () => pointerArrayBenchmark()),
            'idArrayBenchmark': await averageTests(trialRuns, () => idArrayBenchmark()),
            'relationBenchmark': await averageTests(trialRuns, () => relationBenchmark()),
            delete: await cleanupOldData(),
        },
        '100b, 50c': {
            time: await createTestData(100, 50),
            'pointerArrayBenchmark': await averageTests(trialRuns, () => pointerArrayBenchmark()),
            'idArrayBenchmark': await averageTests(trialRuns, () => idArrayBenchmark()),
            'relationBenchmark': await averageTests(trialRuns, () => relationBenchmark()),
            delete: await cleanupOldData(),
        },
        '1000b, 10c': {
            time: await createTestData(1000, 10),
            'pointerArrayBenchmark': await averageTests(trialRuns, () => pointerArrayBenchmark()),
            'idArrayBenchmark': await averageTests(trialRuns, () => idArrayBenchmark()),
            'relationBenchmark': await averageTests(trialRuns, () => relationBenchmark()),
            delete: await cleanupOldData(),
        },
    }
})
