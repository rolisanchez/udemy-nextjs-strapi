"use strict";

/**
 * order controller
 */

const calcDiscountPrice = (price, discount) => {
  if (!discount) return price;
  const discountAmount = (price * discount) / 100;
  const result = price - discountAmount;
  return result.toFixed(2);
};

// @ts-ignore
const { createCoreController } = require("@strapi/strapi").factories;
// import Strapi from "@strapi/strapi";
// const { createCoreController } = Strapi.factories;

// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async paymentOrder(ctx) {
    // ctx.body = "Payment and order generated correctly";
    
    const { token, products, idUser, addressShipping } = ctx.request.body.data;

    if (!token) {
      ctx.throw(400, "Missing TOKEN required fields");
    }
    if (!products || products.length === 0) {
      ctx.throw(400, "Missing PRODUCTS required fields");
    }
    if (!idUser) {
      ctx.throw(400, "Missing IDUSER required fields");
    }
    if (!addressShipping) {
      ctx.throw(400, "Missing ADDRESS SHIPPING required fields");
    }


    let totalPayment = 0;
    products.forEach((product) => {
      const priceTemp = calcDiscountPrice(product.price, product.discount);
      totalPayment += priceTemp * product.quantity;
    });

    const charge = await stripe.charges.create({
      amount: Math.round(totalPayment * 100),
      currency: "USD",
      source: token.id,
      description: `User ID ${idUser}`,
    });

    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(totalPayment * 100),
    //   currency: "usd",
    //   automatic_payment_methods: {
    //     enabled: true,
    //   },
    //   description: `User ID ${idUser}`,
    //   confirm: true,
    // });

    const data = {
      products,
      user: idUser,
      totalPayment,
      idPayment: charge.id,
      addressShipping,
    };

    const model = strapi.contentTypes["api::order.order"];
    const validData = await strapi.entityValidator.validateEntityCreation(
      model,
      data
    );

    const entry = await strapi.db
    .query("api::order.order")
    .create({data: validData,});
    
    return entry;
  },
}));
