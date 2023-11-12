var db=require('../config/connection')
var collections=require('../config/collections');
const bcrypt=require('bcrypt')
var objectId=require('mongodb').ObjectID
const Razorpay = require('razorpay');
const { createBrotliDecompress } = require('node:zlib');
//const { default: orders } = require('razorpay/dist/types/orders');

var instance = new Razorpay({
  key_id: 'rzp_test_diDz4LABm2vVKg',
  key_secret: 'jB9ZAxzVVPtSZjXNn7nA3Yr2',
});

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
        userData.password=await bcrypt.hash(userData.password,10)
        db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data) => {
            resolve(data.ops[0])
        })
    })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collections.USER_COLLECTION).findOne({email:userData.email})
            if(user){
                bcrypt.compare(userData.password,user.password).then((status)=>{
                    if(status){
                        console.log("login sucess")
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("login failed")
                        resolve({status:false})
                    }
                })
            }else{
                console.log("login failed");
                resolve({status:false})
            }
        })
    },
    addToCart:(prodId,userId)=>{
        let proObj={
            items:objectId(prodId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart= await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proexist=userCart.products.findIndex(products=> products.items==(prodId))
            console.log(proexist);
                if(proexist!=-1){
                    db.get().collection(collections.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.items':objectId(prodId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                 db.get().collection(collections.CART_COLLECTION)
                .updateOne({user:objectId(userId)},
                {
                        $push:{products:proObj}
                }
                ).then((response)=>{
                    resolve()
                })
            }
      
            }else{
                let cartObject={
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObject).then((response)=>{
                    resolve()
                })
            }
   
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collections.CART_COLLECTION).aggregate([
                { 
                    $match:{user:objectId(userId)}
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
        
        resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0;
            let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count);
        details.quantity=parseInt(details.quantity);
        return new Promise ((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collections.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{items:objectId(details.product)}}
            }
            ).then((response)=>{
                resolve({removeProduct:true})
            })
            }else{
            db.get().collection(collections.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.items':objectId(details.product)},
            {
                $inc:{'products.$.quantity':details.count}
            }
            ).then((response)=>{
                resolve({status:true})
            })
        }

        })
    },
    getTotalAmount:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let total=0;
                 total=await db.get().collection(collections.CART_COLLECTION).aggregate([
                    { 
                        $match:{user:objectId(userId)}
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
                    },{
                        $group:{
                            _id:null,
                            total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
                        }
                    }
            
            ]).toArray()
            //console.log(total[0].total)
            if(total==0){
                resolve()
            }else{
            resolve(total[0].total)
            }
            })
    

    },placeOrder:(order,products,total)=>{
        return new Promise(async(resolve,reject)=>{
           let userName=await db.get().collection(collections.USER_COLLECTION).findOne({_id:objectId(order.userid)}) 
            let status=order['payment-methord']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:objectId(order.userid),
                userName:userName.name,
            paymentMethord:order['payment-methord'],
            products:products,
            totalAmount:total,
            status:status,
            date : new Date().toLocaleDateString(),
            time : new Date().toLocaleTimeString(),
          }
          db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            db.get().collection(collections.CART_COLLECTION).drop({user:objectId(order.userId)})
            resolve(response.ops[0]._id)
          })

        })

    },getCartProductsList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            
            let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
            console.log(cart)
            resolve(cart.products)
        })
    },getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId);
            let orders=await db.get().collection(collections.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).toArray()
                resolve(orders)
            
        })
    },getorderProduct:(orderId)=>{
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
    },generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(orderId);
            //var instance = new Razorpay({ key_id: 'rzp_test_diDz4LABm2vVKg', key_secret: 'jB9ZAxzVVPtSZjXNn7nA3Yr2' })

     var options={
     amount: total*100,
     currency: "INR",
     receipt:""+orderId,
        };
        instance.orders.create(options, function(err,order){
            if(err){
                console.log(err)
            }else{
                console.log("neww order",order)
            
            resolve(order)
        }
        });
        
            
        })
    },verifiPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const {
                createHmac,
              } = require('node:crypto');
              
              let hmac = createHmac('sha256', 'jB9ZAxzVVPtSZjXNn7nA3Yr2');
              hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
              hmac=hmac.digest('hex')
              if(hmac==details['payment[razorpay_signature']){
                resolve()
              }else{
                reject()
              }
        })
    },changeOrderStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collections.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })

    },removeProduct:(prodId,cartId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collections.CART_COLLECTION)
            .updateOne({_id:objectId(cartId)},
            {
                $pull:{products:{items:objectId(prodId)}}
            })
            resolve()
        })
   },getProductDetails:(prodId)=>{
    return new Promise(async(resolve,reject)=>{
        let productDetails=await db.get().collection(collections.PRODUCT_COLLECTION).find({_id:objectId(prodId)}).toArray()
        let relatedProducts= await db.get().collection(collections.PRODUCT_COLLECTION).find({ "Category":productDetails[0].Category }).toArray()
        var index = relatedProducts.indexOf(productDetails);
        let response=[productDetails[0],relatedProducts]
        //relatedProducts.delete(productDetails[0])
        console.log(relatedProducts) 
        console.log(index)
       console.log(productDetails)
       // resolve(productDetails[0])
       resolve(response)

    })
   },getCategory:(name)=>{
    
    return new Promise(async(resolve,reject)=>{
        let products=await  db.get().collection(collections.PRODUCT_COLLECTION).find({ "Category": name }) 
        .toArray()
        resolve(products)
    })
   }
  

}