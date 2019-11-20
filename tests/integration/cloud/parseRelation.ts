import { Parse } from '../parseConfig/parse.setup'

describe('parseRelations', () => {
    let allCategories: Parse.Object[]
    let allBooks: Parse.Object[]
    let booksForSingleCategory: Parse.Object[]
    // let categoriesForSingleBook: Parse.Object[]
    // let singleBook: Parse.Object | undefined
    let elapsedTime: number

    const numBooks = 1000
    const numCategories = 1000
    const numCategoriesPerBook = 10

    beforeAll(async () => {
        const newCategories = [ ...Array(numCategories) ].map(() => new Parse.Object('Category', {
            name: Math.floor(Math.random() * 1e10),
        }))

        await Parse.Object.saveAll(newCategories)

        const newBooks = [ ...Array(numBooks) ].map(() => new Parse.Object('Book', {
            name: Math.floor(Math.random() * 1e10),
        }))

        newBooks.forEach(book => {
            // Categories will be saved as a parse relation
            const categoryRelation = book.relation('categories')
            categoryRelation.add(newCategories.slice(0, numCategoriesPerBook))
        })

        const saveInitialTime = Date.now()
        await Parse.Object.saveAll(newBooks)
        console.log('Save Time: ', Date.now() - saveInitialTime)

        const initialTime = Date.now()
        allCategories = await new Parse.Query('Category')
            .limit(10000)
            .find()
        allBooks = await new Parse.Query('Book')
            .limit(10000)
            .find()
        booksForSingleCategory = await new Parse.Query('Book')
            .limit(10000)
            .equalTo('categories', allCategories[0])
            .find()
        // categoriesForSingleBook = await allBooks[0].relation('categories').query().find()
        // singleBook = await new Parse.Query('Book').include('categories').first()
        elapsedTime = Date.now() - initialTime
    }, 60000)

    it('returns correct number of total books', () => {
        expect(allBooks.length).toEqual(numBooks)
    })

    it('returns correct number of total categories', () => {
        expect(allCategories.length).toEqual(numCategories)
    })

    it('returns correct number of books for first category', () => {
        expect(booksForSingleCategory.length).toEqual(numBooks)
    })

    // it('returns correct number of categories for first book', () => {
    //     expect(categoriesForSingleBook.length).toEqual(numCategoriesPerBook)
    // })

    // it ('returns a single book', () => {
    //     expect(singleBook).not.toBeUndefined()
    // })

    it('returns an elapsedTime', () => {
        expect(elapsedTime).not.toBeUndefined()
        console.log(elapsedTime)
    })
})