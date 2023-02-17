process.env.NODE_SKIP_PLATFORM_CHECK = 1
const { myLibFun } = require('./mylib')

console.log('I will be exe updated', new Date().toString())
myLibFun()
