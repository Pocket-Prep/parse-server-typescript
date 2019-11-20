import { Parse } from '../parseConfig/parse.setup'

describe('stringIds', () => {
    let allCategories: Parse.Object[]
    let allBooks: Parse.Object[]
    let booksForSingleCategory: Parse.Object[]
    let categoriesForSingleBook: Parse.Object[] | undefined
    let singleBook: Parse.Object | undefined
    let elapsedTime: number

    const numBooks = 10000
    const numCategories = 10000
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
            // Category ids will be saved in an array
            book.set({
                categories: newCategories.slice(0, numCategoriesPerBook).map(cat => cat.id),
            })
        })

        await Parse.Object.saveAll(newBooks)

        const initialTime = Date.now()
        // allCategories = await new Parse.Query('Category')
        //     .limit(10000)
        //     .find()
        // allBooks = await new Parse.Query('Book')
        //     .limit(10000)
        //     .find()
        // booksForSingleCategory = await new Parse.Query('Book')
        //     .limit(10000)
        //     .equalTo('categories', allCategories[0].id)
        //     .find()
        // categoriesForSingleBook = allBooks[0].get('categories')
        singleBook = await new Parse.Query('Book').first()
        categoriesForSingleBook = singleBook && await new Parse.Query('Category')
            .containedIn('objectId', singleBook.get('categories')).limit(10000).find()
        elapsedTime = Date.now() - initialTime
    })

    // it('returns correct number of total books', () => {
    //     expect(allBooks.length).toEqual(numBooks)
    // })

    // it('returns correct number of total categories', () => {
    //     expect(allCategories.length).toEqual(numCategories)
    // })

    // it('returns correct number of books for first category', () => {
    //     expect(booksForSingleCategory.length).toEqual(numBooks)
    // })

    it('returns correct number of categories for first book', () => {
        expect(categoriesForSingleBook && categoriesForSingleBook.length).toEqual(numCategoriesPerBook)
    })

    it('returns an elapsedTime', () => {
        expect(elapsedTime).not.toBeUndefined()
        console.log(elapsedTime)
    })
})