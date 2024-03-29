const httpStatus = require("http-status");
const { Cart, Product,User } = require("../models");
const ApiError= require('../utils/ApiError')
const config = require("../config/config");
const {getProductById,getProducts} = require('./product.service')

// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => { 
  const {email} = user;
  const userCart= await Cart.findOne({email});
  if(userCart){
    return userCart;
  }
  else{
   throw new ApiError(httpStatus.NOT_FOUND,'User does not have a cart');
  }
  
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
 const {email} = user;
 let userCart =await Cart.findOne({email});
 console.log(userCart)
 if(!userCart){
  try{
    userCart = await Cart.create({email});
    if(!userCart)
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR,"Cart creation failed");
  }catch(error){
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR,"Cart creation failed");
  }
 }
 
 const {cartItems} = userCart;
 let itemIndex = JSON.parse(JSON.stringify(cartItems)).findIndex((p) =>{
  return p.product._id === productId
  });

   if (itemIndex > -1) {
  
      throw new ApiError(httpStatus.BAD_REQUEST,'Product already in cart. Use the cart sidebar to update or remove product from cart')
  } 
 const productToAdd = await getProductById(productId);
 if(!productToAdd){
  throw new ApiError(httpStatus.BAD_REQUEST,"Product doesn't exist in database");
 }
 
 userCart.cartItems.push({product:productToAdd,quantity});
 console.log(userCart)

 await userCart.save();

 return userCart;
 
  
};

/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
 const updateProductInCart = async (user, productId, quantity) => {
  console.log('update',productId);
  const {email} =user;
  let userCart = await Cart.findOne({email});
  //console.log(userCart)
  if(!userCart){
    throw new ApiError(httpStatus.BAD_REQUEST,"User does not have a cart. Use POST to create cart and add a product")
  }
  const isProductInDatabse = await getProductById(productId);
  
  if(!isProductInDatabse){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product doesn't exist in database");
  }
  const {cartItems} =userCart;
  let productItemIndCart = JSON.parse(JSON.stringify(cartItems)).findIndex((p) =>{
    return p.product._id === productId
    });
    
  if (productItemIndCart === -1) {
    throw new ApiError(httpStatus.BAD_REQUEST,'Product not in cart"')
     
  }
  else{
    userCart.cartItems[productItemIndCart].quantity=quantity;
  }
 
 
 await userCart.save();
 
 return userCart;

};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  const {email} =user;
   const userCart= await Cart.findOne({email});
   if(!userCart){
    throw new ApiError(httpStatus.BAD_REQUEST,"User does not have a cart")
   }
   const {cartItems} =userCart;
   if(JSON.parse(JSON.stringify(cartItems)).findIndex((item)=>item.product._id === productId) === -1){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product not in cart")
   }

   const filteredData = JSON.parse(JSON.stringify(cartItems)).filter(
    (item)=> item.product._id !== productId
   )

   userCart.cartItems = filteredData;
   await userCart.save();
   return userCart;
};


const checkout = async (user) => {
  const userCart= await Cart.findOne({email:user.email});
  //Tes1 1
  if(userCart==null){
    throw new ApiError(httpStatus.NOT_FOUND,"user does not have a cart")
  }
  if(userCart.cartItems.length===0){
    throw new ApiError(httpStatus.BAD_REQUEST,"Cart Empty")
  }
  const hasSetNonDefaultAddress = await user.hasSetNonDefaultAddress();
   console.log(hasSetNonDefaultAddress,"address cartService")
    if(!hasSetNonDefaultAddress){
        throw new ApiError(httpStatus.BAD_REQUEST,"address not set")
    }
  

    const totalCartCost= userCart.cartItems.reduce(
      (total, item) => total + item.product.cost * item.quantity,
      0
    )
    if(totalCartCost > user.walletMoney){
      throw new ApiError(httpStatus.BAD_REQUEST,'Insufficient balance')
    }

    user.walletMoney = user.walletMoney - totalCartCost;
   
    userCart.cartItems=[];
    await userCart.save();
    await user.save();
    
   return user;

};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
