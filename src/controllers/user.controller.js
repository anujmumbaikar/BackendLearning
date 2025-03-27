import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { channel } from "diagnostics_channel"

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
    console.log(req.files.avatar[0].path);
    
    
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
    if(!username && !email){
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
    cookie("accessToken",accessToken,options). //key, value, options
    cookie("refreshToken",refreshToken,options).
    json(
        new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"user logged in successfully")
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
      await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
      )
      const options = {
        httpOnly:true,
        secure:true
    }
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).
    json(new ApiResponse(200,{},"user logged out"))
})

//what if our accessToken get expired then we hv to give refreshToken which is stored into our db
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(401,"RefreshToken is expired or used")
        }
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        const options = {
            httpOnly:true,
            secure:true
        }
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).
        json(new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},"access token refreshed successfully"))
    } catch (error) {
        throw new ApiError(404,"AccessToken not updated")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldpassword,newPassword} = req.body
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)
    if(!isPasswordCorrect){
        throw new ApiError(404,"Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email,} = req.body
    if(!fullname || !email){
        throw new ApiError(400,"all fields are requried")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname:fullname,
                email:email
            }
        },
        {new:true}
    ).select("-password")
    //agar hame .select()  yaha nhi use krna hai to hame again findby user._id backend hit krte and the .select use krke krte
    //lekin above is also true . here we are saving databse calls

    return res.status(200).json(new ApiResponse(200,user,"Account details updates successfully"))
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    //req.file kaha se mila?? multer middleware se
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is requried")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(500,"something went wrong while uploading avatar")   
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    //req.file kaha se mila?? multer middleware se
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"cover image file is requried")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(500,"something went wrong while uploading image")   
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,"Cover Image updated successfully"))

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    //get username from req.params which means from url
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is requried")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions", //Subscription changes to subscriptions in db
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        //what we want to do is ..... whatever the document which has come to me , am i tthere in that document or not !!
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel not found")
    }
    return res.status(200).json(new ApiResponse(200,channel[0],"Channel profile fetched successfully"))

})

const getWatchHistory = asyncHandler(async(req,res)=>{
    //interview ques . req.user._id // what do we get in this?
    //Many of u will say we get mongoDb id, but its not actually true.
    //we get a string , this string is not a mongoDb id, 
    //when we actually need the mongoDB ID we need ObjectId('k23j4b3l543n36bi43j53kn') like this.
    //And we are using mongoose,so when we give this string to mongoose it automatically converts it into mongoDB ObjectId.
    //so req.user._id here we get a string not a mongoDb id
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    //this is optional , as we know we get data in array and we hv to access its [0] th index
                    //now this is optional, where we can change the datastructure to ease.
                    //cuz as we hv done , there may be array inside array , two for loops etc then access its 0th value
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"  // or $arrayElemAt:["$owner",0]
                            }
                        }
                    }
                    //now in frontend we get object insted of array
                ]
            }
        }
    ])
})




export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile}