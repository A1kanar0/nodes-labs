import { PrintModel, IPrintModel } from '../models/printModel.model';
import { CreatePrintModelInput, UpdatePrintModelInput } from '../schemas/printModel.schema';

export const printModelStorage = {
    getAll: async (filters: { maxTime?: number; material?: string; sort?: string; page?: number; limit?: number }) => {
        const { maxTime, material, sort = '-createdAt', page = 1, limit = 10 } = filters;

        const query: any = {};

        if (maxTime) {
            query.printTimeMinutes = { $lte: maxTime };
        }
        if (material) {
            query.material = material;
        }

        const skip = (page - 1) * limit;

        const [data, totalItems] = await Promise.all([
            PrintModel.find(query).sort(sort).skip(skip).limit(limit),
            PrintModel.countDocuments(query)
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            }
        };
    },

    getById: async (id: string): Promise<IPrintModel | null> => {
        return await PrintModel.findById(id);
    },

    create: async (data: CreatePrintModelInput): Promise<IPrintModel> => {
        const newModel = new PrintModel(data);
        return await newModel.save();
    },

    update: async (id: string, data: UpdatePrintModelInput): Promise<IPrintModel | null> => {
        return await PrintModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    },

    delete: async (id: string): Promise<boolean> => {
        const result = await PrintModel.findByIdAndDelete(id);
        return result !== null;
    }
};