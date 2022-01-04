const groupCommonFields = `
  posId: String
  description: String
  name: String
  categoryIds: [String]
  excludedCategoryIds: [String]
  excludedProductIds: [String]
`;

const posCommonFields = `
  name: String
  description: String
  brandId: String
  tagIds: [String]
  productDetails: [String]
  adminIds: [String]
  cashierIds: [String]
  isOnline: Boolean
  branchId: String
  allowBranches: [String]
  beginNumber: String
  waitingScreen: JSON
  kitchenScreen: JSON
  kioskMachine: JSON
  uiOptions: JSON
  formSectionTitle: String
  formIntegrationIds: [String]
  token: String
  ebarimtConfig: JSON
`;

const catProd = `
  _id: String
  categoryId: String
  productId: String
`;

export const types = `
  type CatProd {
    ${catProd}
  }

  type Pos {
    _id: String
    createdAt: Date
    integrationId: String
    userId: String
    integration: Integration
    user: User
    ${posCommonFields}
    catProdMappings: [CatProd]
  }

  type ProductGroups {
    _id: String
    name: String
    description: String
    posId: String
    categoryIds: [String]
    excludedCategoryIds: [String]
    excludedProductIds: [String]
  }

  input GroupInput {
    _id: String
    description: String
    name: String
    categoryIds: [String]
    excludedCategoryIds: [String]
    excludedProductIds: [String]
  }

  input CatProdInput {
    ${catProd}
  }

  type PosOrder {
    _id: String,
    createdAt: Date,
    status: String,
    paidDate: Date,
    number: String,
    customerId: String,
    cardAmount: Float,
    cashAmount: Float,
    mobileAmount: Float,
    totalAmount: Float,
    finalAmount: Float,
    shouldPrintEbarimt: Boolean,
    printedEbarimt: Boolean,
    billType: String,
    billId: String,
    registerNumber: String,
    oldBillId: String,
    type: String,
    userId: String,

    items: JSON,
    posToken: String,
    syncId: String,
  }
`;

const queryParams = `
  page: Int
  perPage: Int
  sortField: String
  sortDirection: Int
`;

export const queries = `
  posList(page: Int,
    perPage: Int,
    brandId: String,
    tag: String,
    status: String,
    isOnline: String,
    sortField: String
    sortDirection: Int): [Pos]
  posDetail(_id: String!): Pos
  productGroups(posId: String!): [ProductGroups]

  posOrders(${queryParams}): [PosOrder]
`;

export const mutations = `
  posAdd(${posCommonFields}, catProdMappings: [CatProdInput]): Pos
  posEdit(_id: String ${posCommonFields}, catProdMappings: [CatProdInput]): Pos
  posRemove(_id: String!): JSON
  productGroupsAdd(${groupCommonFields}): ProductGroups
  productGroupsBulkInsert(posId: String, groups:[GroupInput]): [ProductGroups]
`;
