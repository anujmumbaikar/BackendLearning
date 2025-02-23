class ApiError extends Error {
    constructor(
        statusCode,
        message="Something Went Wrong",
        errors = [],
        statck = "" 
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors



        //dont neeed to understand or to write it..
        //usually people write this in production
        if(statck){
            this.stack = statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}