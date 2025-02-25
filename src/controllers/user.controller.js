import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

//generation access and refresh tokens
//yeh actually hamara internal use ke liye hai islye ham asyncHandler nhi use karenge
//hame ye web req pr nhi chahiye
const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        //now u know what ham access token user ko dete hai, lekin jo refresh token hai ham
        //unhe database ke ander bhi save krke rakhte hai so bar bar user se password na puchna pade

        user.refreshToken = refreshToken
        //now when we save it into database , mongoose models there are values which is required compulsory
        //but yaha pe toh password hai nhi. so we pass one parameter which is validateBeforeSave
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access tokens")
    }
}


const registerUser = asyncHandler( async(req,res)=>{

    //-----steps------------->
    //get user details from frontend
    //validation
    //check if user already exists : username,email
    // check for images , check for avatar
    //uppload them to cloudinary,avatar
    //create user object - create entry in db
    //remove password and refresh tokens filed from response
    // check for user creation
    //return res




    //1.to get user details from frontend, its easy , we get it in req 
    const {fullname,email,username,password} = req.body
    //console.log("email:",email);

    if(
        [fullname,email,username,password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400,"Alll fields are requried")
    }
    const existsUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existsUser){
        throw new ApiError(400,"User Already exists")
    }
    
    
    //req.body se hamre pas sara ka sara data aata hai, lekin jab hamne router ke ander ek middleware add kr diya hai,before calling registerUser
    //so just like req.body by default express ne diya hai same , multer bhi hame kuch fields deta hai which is req.files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(req.files);
    
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //console.log(req.files);
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is requried")
    }
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar file is requried")
    }
    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //we hv to select which we dont want ...by default all are selected
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registring the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

    

} )

const loginUser = asyncHandler(async(req,res)=>{
    //steps for login
    //req.body se data le aao
    //username or email access
    //check if email or username exists or not
    //if we get user check password
    //access and refresh tokens generate and send to user
    //sending tokens through cookies

    const {username,email,password} = req.body
    if(!username || !email){
        throw new ApiError(400,"username or password is requried")
    }
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"user does not exists")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(404,"incorrect password")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")


    const options = {
        httpOnly:true,
        secure:true
    }
    return res.
    status(200).
    cookie("accessToken",accessToken,options).
    cookie("refreshToken",refreshToken,options).
    json(
        new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"user logged in successfully")
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
      
})


export {registerUser,loginUser}