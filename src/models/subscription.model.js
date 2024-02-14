import mongoose from "mongoose"

const subscriptionSchema = new mongoose.Schema(
    {
        subscriber:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        channel:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }
)

export const Subscription  = mongoose.model('Subscription', subscriptionSchema)

// subscriber and channels both are users only
// here if we see if we can add the subscribers in an array but, there's a catch there can be millions of subscribers of as well now, what if subscriber unsubscribes and it is stored in the middle of an array.
// also, what if user resides at the beginining of the array and he unsubscribes it then, we'll have to shift the entire array 
// here, we need fast access plus dynamic addition and deletion so we'll have to choose a different data structure
// but, here we are creating a new document for each subscription and we'll leave the rest to mongodb
// Thus, we need an optimized approach
