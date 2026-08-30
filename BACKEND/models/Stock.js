const { Schema, model } = require('mongoose');
const { isStockQuantity } = require('../utils/stockValidation');

const normalizeStockIdentity = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const finiteQuantity = (value) => isStockQuantity(value);

const stockSchema = new Schema(
  {
    itemName: {
      type: String,
      required: true,
      enum: ['Detergent', 'Fabric Softener', 'Soap', 'Bleach', 'Starch'],
      trim: true,
    },
    itemKey: { type: String, trim: true, lowercase: true },
    currentQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: { validator: finiteQuantity, message: 'Quantity must be finite, within limits and have at most 3 decimals' },
    },
    unit: {
      type: String,
      enum: ['Liters', 'Kg', 'Pieces'],
      default: 'Liters',
    },
    reorderLevel: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
      validate: { validator: finiteQuantity, message: 'Reorder level must be finite, within limits and have at most 3 decimals' },
    },
    lastRestockDate: {
      type: Date,
      default: Date.now,
    },
    lastRestockQuantity: {
      type: Number,
      default: 0,
    },
    consumptionHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        quantityUsed: {
          type: Number,
          required: true,
          min: 0,
        },
        reason: {
          type: String,
          default: 'Daily Consumption',
        },
      },
    ],
    averageDailyConsumption: {
      type: Number,
      default: 0,
    },
    estimatedDepletionDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'High',
    },
    alerts: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        message: String,
        severity: {
          type: String,
          enum: ['warning', 'critical'],
        },
        isResolved: {
          type: Boolean,
          default: false,
        },
        resolvedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

stockSchema.index(
  { itemKey: 1 },
  { unique: true, partialFilterExpression: { itemKey: { $type: 'string' } }, name: 'stock_item_key_unique' },
);

stockSchema.pre('validate', function setNormalizedIdentity() {
  this.itemKey = normalizeStockIdentity(this.itemName);
});

stockSchema.pre('save', function (next) {
  if (this.consumptionHistory.length > 0) {
    const totalConsumption = this.consumptionHistory.reduce(
      (sum, entry) => sum + entry.quantityUsed,
      0
    );
    const daysTracked = Math.max(
      1,
      Math.ceil(
        (new Date() - this.consumptionHistory[0].date) / (1000 * 60 * 60 * 24)
      )
    );
    this.averageDailyConsumption = totalConsumption / daysTracked;

    if (this.averageDailyConsumption > 0) {
      const daysLeft = this.currentQuantity / this.averageDailyConsumption;
      this.estimatedDepletionDate = new Date(
        Date.now() + daysLeft * 24 * 60 * 60 * 1000
      );
    }
  }

  if (this.currentQuantity <= this.reorderLevel) {
    this.status = 'Low';
  } else if (this.currentQuantity <= this.reorderLevel * 2) {
    this.status = 'Medium';
  } else {
    this.status = 'High';
  }

  next();
});

const Stock = model('Stock', stockSchema);
Stock.normalizeStockIdentity = normalizeStockIdentity;
Stock.finiteQuantity = finiteQuantity;
module.exports = Stock;
