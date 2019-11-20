import { Parse } from '../parseConfig/parse.setup'

export const clearParseTestData = async () => {
    const allBooks = await new Parse.Query('Book').limit(10000).find()
    const allCategories = await new Parse.Query('Category').limit(10000).find()
    await Parse.Object.destroyAll([ ...allBooks, ...allCategories ], { useMasterKey: true })
}