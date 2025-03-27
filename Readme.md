//req is the request object which is passed to the middleware function in express
//it contains all the information about the request that is made to the server
//for eg. req.body contains the data that is sent from the client to the server
//req.params contains the parameters that are passed in the url

//what is res?
//res is the response object which is passed to the middleware function in express
//it contains all the methods that are used to send the response back to the client
//for eg. res.send() is used to send a response back to the client
//res.json() is used to send a json response back to the client
//res.status() is used to set the status code of the response

//what are cookies?
//cookies are small pieces of data that are stored on the client side by the server
//they are used to store information about the user and accessTokens and refreshTokens
//cookies are sent to the server with every request that is made to the server
//with req.cookies we can access the cookies that are sent by the client to the server
//with res.cookie() we can set the cookies that are sent by the server to the client

//By writing the .cookie() method we are setting the cookies in the response object
//means we are sending the cookies to the client

//By writing the .clearCookie() method we are clearing the cookies in the response object
//means we are clearing the cookies from the client

This is a learning backend series with javascript


27R3VDEFYFX4N0VC3FRTQZX emu8086 code
