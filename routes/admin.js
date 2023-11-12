var express = require('express');
var router = express.Router();
var productHelper=require('../helpers/product-helpers');
const { log } = require('handlebars');
let adminLoginStatus=false;
let Loginerr=false;
const verifyLoginAdmin=(req,res,next)=>{
  if(adminLoginStatus){
    next()
  }else{
    res.redirect('/admin/admin-login')
  }
} 

/* GET users listing. */
router.get('/', function(req, res,) {
  if(adminLoginStatus){
  productHelper.getAllProducts().then((products)=>{
    res.render('admin/view-product',{admin:true,products,adminLoginStatus});
  })
}else{
  res.redirect('/admin/admin-login')
}
}); 

router.get('/admin-login',(req,res)=>{
  res.render('admin/admin-login',{admin:true,"loginerr":Loginerr})
  
  }

 
)
router.post('/admin-login',(req,res)=>{
  productHelper.doAdminLogin(req.body).then((response)=>{
      if(response.status){
        adminLoginStatus=true
        //req.session.admin=response.admin
        res.redirect('/admin')
      }else{
        Loginerr="invalid username or password";
        res.redirect('/admin/admin-login')
      }
  })
})
  
  router.get('/add-product',verifyLoginAdmin,function(req,res){

    res.render('admin/add-product',{admin:true,adminLoginStatus})
  })
  router.post('/add-product',(req,res)=>{
  productHelper.addProduct(req.body,(id)=>{
    let image = req.files.Image
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render("admin/add-product");
      }else{
        console.log(err)
      }
  })
})  
})
router.get('/logout',function(req,res){
  adminLoginStatus=false;
  Loginerr=false;
  res.redirect('/admin')
  })
router.get('/delete-product/:id',verifyLoginAdmin,(req,res)=>{
  let productId=req.params.id
  productHelper.deleteProduct(productId).then((response)=>{
    location.reload()
  })

})
router.get('/edit-product/:id',verifyLoginAdmin,async(req,res)=>{
  let productId=req.params.id
  let product=await productHelper.getAllProductDetails(productId)
  console.log(product)
  res.render('admin/edit-product',{product,admin:true,adminLoginStatus})
})
router.post('/edit-product/:id',(req,res)=>{
  productHelper.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    console.log(req.body)
    if(req.files.Image){
      let id=req.params.id
      let image=req.files.Image
      image.mv('./public/product-images/'+id+'.jpg')
    }else{}

  })
})
router.get('/all-users',verifyLoginAdmin,(req,res)=>{
  productHelper.getAllUsers().then((users)=>{
    res.render('admin/all-users',{users,admin:true,adminLoginStatus})
  })
  
})
router.get('/all-orders',verifyLoginAdmin,(req,res)=>{
  productHelper.getAllOrders().then((allOrders)=>{
    res.render('admin/view-allorders',{allOrders,admin:true,adminLoginStatus})
  })
})
router.get('/view-order-productss/:id/:userId',verifyLoginAdmin,async(req,res)=>{
  let products=await productHelper.adminGetorderProduct(req.params.id)
  res.render("admin/view-order-products",{user:req.params.userId,products,admin:true,adminLoginStatus})
})
router.get('/change-order-status/:id/:userId',verifyLoginAdmin,(req,res)=>{
   productHelper.changeOrderStatus(req.params.id,req.params.userId)
 // location.reload()
 res.redirect('/admin/all-orders')

})

module.exports = router;

