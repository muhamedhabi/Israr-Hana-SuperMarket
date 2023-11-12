var express = require('express');
var router = express.Router();
var productHelper=require('../helpers/product-helpers')
var userHelpers=require('../helpers/user-healpers');
// const { default: products } = require('razorpay/dist/types/products');

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedin){
    next()
  }else{
    res.redirect('/user-login')
  }
}

/* GET home page. */
router.get('/',async function(req, res, next) {
  let user=req.session.user
  console.log(user);
  let cartCount=null;
  if(req.session.user){
  cartCount= await userHelpers.getCartCount(req.session.user._id)}
  productHelper.getAllProducts().then((products)=>{
    res.render('user/view-products',{admin:false,products,user,cartCount });
  })
  })
  router.get('/user-login',(req,res)=>{
    if(req.session.user){
      res.redirect('/')
    }else{
    res.render('user/user-login',{"loginerr":req.session.userLoginerr})
    req.session.userLoginerr=false
    }
  })
  router.get('/user-signup',(req,res)=>{
    res.render('user/user-signup')
  })
  router.post('/user-signup',(req,res)=>{
    userHelpers.doSignup(req.body).then((response)=>{
      console.log(response);
      req.session.user=response
      req.session.user.loggedin=true
      res.redirect('/')
    }) 
  })
  router.post('/user-login',(req,res)=>{
    userHelpers.doLogin(req.body).then((response)=>{
        if(response.status){
          req.session.user=response.user
          req.session.userLoggedin=true
          res.redirect('/')
        }else{req.session.userLoginerr="invalid username or password"
          res.redirect('/user-login')
        }
    })
  })
  router.get('/user-logout',(req,res)=>{
    req.session.user=null
    req.session.userLoggedin=false
    res.redirect('/')

  })

  router.get('/remove-product/:id/:cid',verifyLogin,async(req,res)=>{
    let productId=req.params.id
    let cartId=req.params.cid
    userHelpers.removeProduct(productId,cartId).then((response)=>{
      res.redirect('/cart')
    })
  })

  router.get('/cart',verifyLogin,async(req,res)=>{
   
    let products=await userHelpers.getCartProducts(req.session.user._id)
    let total=await userHelpers.getTotalAmount(req.session.user._id)
    console.log(products);
    let user=req.session.user._id
    res.render('user/cart',{products,user,total})
  })
  router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{
    console.log("api called");
    userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
      res.json({status:true})
    })
  })
  router.post('/change-product-quantity',(req,res)=>{
  
    userHelpers.changeProductQuantity(req.body).then(async(response)=>{
      response.total=await userHelpers.getTotalAmount(req.body.user)
      res.json(response)
    })
  })
  router.get('/place-order',verifyLogin,async(req,res)=>{
    let total=await userHelpers.getTotalAmount(req.session.user._id)
    res.render("user/place-order",{total,user:req.session.user})
  })
  router.post('/place-order',async(req,res)=>{
    console.log(req.body)
    let products=await userHelpers.getCartProductsList(req.body.userid)
    let totalPrice=await userHelpers.getTotalAmount(req.body.userid)
    userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
      if(req.body['payment-methord']==='COD'){
        res.json({codsuccess:true})
      }else{
        userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
          res.json(response)

        })
      }
     
    })
    
  })
  router.get('/order-success',verifyLogin,(req,res)=>{
    res.render("user/order-succes",{user:req.session.user})
  })
  router.get('/orders',verifyLogin,async(req,res)=>{
    let orders=await userHelpers.getUserOrders(req.session.user._id)
    console.log("ordersss"+orders);
    res.render("user/order",{user:req.session.user,orders})
  })
  router.get('/view-order-products/:id',verifyLogin,async(req,res)=>{
    let products=await userHelpers.getorderProduct(req.params.id)
    res.render("user/view-order-product",{user:req.session.user,products})
  })
  router.post('/verify-payment',(req,res)=>{
    console.log(req.body)
    userHelpers.verifiPayment(req.body).then(()=>{
      userHelpers.changeOrderStatus(req.body['order[reciept]']).then(()=>{
        res.json({status:true})
      })

    }).catch((err)=>{
      res.json({status:false})
    })
    res.json(response)
  })
  /* router.get('/view-product-details/:id',(req,res)=>{
    userHelpers.getProductDetails(req.params.id).then((productDetails)=>{
      userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
        res.json({status:true})
      res.render('user/product-details',{productDetails,user:req.session.user})
    })
  })*/
  router.get('/view-product-details/:id',verifyLogin,(req,res)=>{
    userHelpers.getProductDetails(req.params.id).then(async(response)=>{
     // console.log("res"+response.productDetails[0])
      //productDetails=response.productDetails;
      //relatedProducts=response.relatedProducts
      let productDetails=response[0]
      let relatedProducts=response[1]
      console.log("relllll"+relatedProducts)
     if(req.session.user){
      cartCount= await userHelpers.getCartCount(req.session.user._id)}
      /*userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{ */
       // res.json({status:true})
       // res.render('user/product-details',{productDetails,user:req.session.user,cartCount})
       res.render('user/product-details',{productDetails,relatedProducts,user:req.session.user,cartCount})
      })
   // })
  })
  router.get('/category/:key',async(req,res)=>{
    cartCount= await userHelpers.getCartCount(req.session.user._id)
    userHelpers.getCategory(req.params.key).then((products)=>{
    res.render('user/category',{products,user:req.session.user,cartCount})
  })
  })



module.exports = router;
