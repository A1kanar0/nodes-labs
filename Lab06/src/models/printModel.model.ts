import mongoose, {Schema, Document} from "mongoose";

export interface IPrintModel extends Document {
    title: string;
    ownerId: mongoose.Schema.Types.ObjectId;
    description?: string;
    printTimeMinutes: number;
    weightGrams: number;
    material: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'PETG-CF';
    readonly formattedTime: string;
}

const PrintModelSchema = new Schema<IPrintModel>({
    title: {
        type: String,
        required: true,
        minlength: [2, 'Name should be at least 2 characters'],
        maxlength: [100, 'Name cannot be more than 100 characters'],
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description too long'],
        required: false,
        trim: true,
    },
    printTimeMinutes: {
        type: Number,
        required: true,
        min: [1, 'PrintTime should be at least 1 minute'],
        validate: {
            validator: function (value: number) {
                return Number.isInteger(value);
            },
            message: "PrintTime must be a integer"
        }
    },
    weightGrams: {
        type: Number,
        required: true,
        min: [0.1, 'Weight must be a positive integer'],
    },
    material: {
        type: String,
        enum: {
            values: ['PLA', 'PETG', 'ABS', 'TPU', 'PETG-CF'],
            message: '{VALUE} not supported. Choose a material from list',
        },
        default: 'PLA',
    },
},
    {
        timestamps: true,
        toJSON: {virtuals: true},
        toObject: {virtuals: true},
    }
    );

PrintModelSchema.virtual('formattedTime').get(function () {
    const hours = Math.floor(this.printTimeMinutes / 60);
    const minutes = this.printTimeMinutes % 60;

    if (hours === 0) {
        return `${minutes}m`
    }
    return `${hours}h ${minutes}m`;
});

export const PrintModel = mongoose.model<IPrintModel>('PrintModel', PrintModelSchema);