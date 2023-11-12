const { reject } = require('promise');
var db=require('../config/connection')
var collections=require('../config/collections');
//const Collection = require('mongodb/lib/collection');
var objectId=require('mongodb').ObjectID



module.exports =  {
 addProduct:(product,callback)=>{
    console.log(product);
    db.get().collection('product').insertOne(product).then((data)=>{
        
        console.log(data.ops[0].id)
      callback(data.insertedId.toString())
      
      
    })
} ,getAllProducts:()=>{
    return new Promise(async(resolve,reject)=>{
        let products= await db.get().collection(collections.PRODUCT_COLLECTION).find().toArray()
        resolve(products)
    })
} , deleteProduct:(prodId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.PRODUCT_COLLECTION).removeOne({_id:objectId(prodId)}).then((response)=>{
            console.log(response)
            resolve(response)
        })
    })
}, getAllProductDetails:(proId)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
            resolve(product)
        })
    })
},updateProduct:(prodId,ProdDetails)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.PRODUCT_COLLECTION)
        .updateOne({_id:objectId(prodId)},{
            $set:{
                Name:ProdDetails.Name,
                Category:ProdDetails.Category,
                Desciption:ProdDetails.Description,
                Price:ProdDetails.Price,
             }
        }).then((response)=>{
            resolve()
        })
    })
},doAdminLogin:(adminData)=>{
    return new Promise((resolve,reject)=>{
        console.log("ethitooo")
        console.log("admin"+adminData[0])
    let adminLoginStatus=false
    let response={}
    console.log(adminData)
            if(adminData.username==="israrhana0" && adminData.password==="196400"){
                console.log("login success")
                response.status=true
                resolve(response)
            }else{
                console.log("login failed")
                resolve({status:false})
            }    
                    })
},getAllUsers:()=>{
    return new Promise(async(resolve,reject)=>{
    let users=await db.get().collection(collections.USER_COLLECTION).aggregate([
        {
            $project:{
                name:'$name',
                email:'$email'
            }
        }

           ]).toArray()
    console.log(users)
    resolve(users)
        
      })
    },getAllOrders:()=>{
        return new Promise(async(resolve,reject)=>{
            let allorders=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $project:{
                        deliveryDetails:'$deliveryDetails',
                        userId:'$userId',
                        paymentMethord:'$paymentMethord',
                        products:'$products',
                        totalAmount:'$totalAmount',
                        status:'$status',
                        date:'$date',
                        time:'$time',
                        username:'$userName'
                    }
                }
        
        ]).toArray()
            console.log(allorders)
            resolve(allorders)
        })
    },adminGetorderProduct:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                { 
                    $match:{_id:objectId(orderId)}
                },{
                    $unwind:'$products'
                },{
                    $project:{
                        items:'$products.items',
                        quantity:'$products.quantity'
                    }
                },{
                    $lookup:{
                        from:collections.PRODUCT_COLLECTION,
                        localField:'items',
                        foreignField:'_id',
                        as:'product'
                    }
                },{
                    $project:{
                        items:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
        
        ]).toArray()
        
        resolve(orderItems)
        })
     },changeOrderStatus:(orderId,userId)=>{
        db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
        { 
            $set:{status:"deliverd"}
        }
        )

     }



    }