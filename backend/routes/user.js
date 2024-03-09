const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { JWT_SECRET } = require("../config");
const zod = require('zod');
const { User, Account } = require('../db/db');
const {authMiddleware} = require('../middlewares')

router.use(express.json());

const signupBody = zod.object({
    username: zod.string().email(),
    firstname: zod.string(),
    lastname: zod.string(),
    password: zod.string()
});

router.post('/signup', async (req, res) => {
    try {
        const { username, firstname, lastname, password } = req.body;
        if (username && password && firstname && lastname) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(409).json({
                    message: "Email already taken/Incorrect inputs"
                });
            }
            const user = new User({
                username,
                firstname,
                lastname,
                password
            });
            await user.save();
            const userId = user._id;

            await Account.create({
                userId,
                balance: 1+Math.random()*10000
            })
            const token = jwt.sign({
                userId,
            }, JWT_SECRET);

            return res.json({
                message: "User created successfully",
                token
            });
        } else {
            return res.status(411).json({
                message: "Email already taken / Incorrect inputs"
            });
        }
    } catch (error) {
        console.error("Error occurred while signing up:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username && password) {
            const userExists = await User.findOne({ username });
            if (userExists && password === userExists.password) {
                const token = jwt.sign({
                    userId: userExists._id
                }, JWT_SECRET);

                return res.status(200).json({
                    message: "User successfully logged in",
                    token
                });
            } else {
                return res.status(401).json({
                    message: "Invalid username or password"
                });
            }
        } else {
            return res.status(400).json({
                message: "Invalid request"
            });
        }
    } catch (error) {
        console.error("Error occurred while signing in:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
});


const updateBody = zod.object({
    password : zod.string().optional(),
    firstname: zod.string().optional(),
    lastname: zod.string().optional()
});

router.put('/',authMiddleware,async(req,res)=>{
    try{
    const {success,data} = updateBody.safeParse(req.body)
    if(!success)
    {
        return res.status(411).json({
            message: "Error while updating information"
        })
    }
    const updateData = {};
    if(data.password) updateData.password = data.password;
    if(data.firstname) updateData.firstname = data.firstname;
    if(data.lastname)  updateData.lastname =data.firstname.lastname;    
    await User.updateOne({_id:req.userId},updateData);
    
    res.json({
        message: "Updated Successfully"
    })
}catch(error)
{
    console.error("Error occurred while updating user information",error);
    return res.status(500).json({
        message: "Internal server errror"
    })
}
});

router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [{
            firstname: {
                "$regex": filter
            }
        }, {
            lastname: {
                "$regex": filter
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            _id: user._id
        }))
    })
})

module.exports = router;
