const asyncHandler = (requestHandler) => {
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=> next(err))
    }
}

export {asyncHandler}


//OR by try-catch
//higher order function
//we have made a wrapper function where we are using this everywhere
//const asyncHandler = (fn) => () => {} //means passing function as parameter
// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }