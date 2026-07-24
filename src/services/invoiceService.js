import prisma from "../config/prisma.js";


const generateInvoiceNo = async () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD


  const lastInvoice = await prisma.invoices.findFirst({
    where: {
      InvoiceNo: { startsWith: `INV-${dateStr}-` }
    },
    orderBy: { InvoiceID: 'desc' }
  });

  let nextSequence = 1;
  if (lastInvoice) {
    const lastSequenceStr = lastInvoice.InvoiceNo.split('-')[2];
    nextSequence = parseInt(lastSequenceStr, 10) + 1;
  }

  const sequenceStr = nextSequence.toString().padStart(4, "0");
  return `INV-${dateStr}-${sequenceStr}`;
};


const fetchInvoiceFullData = async (transactionId) => {
  const transaction = await prisma.transactions.findUnique({
    where: { TransactionID: transactionId },
    include: {
      BookingGroups: {
        include: {
          branches: true,
          BookingItems: {
            include: {
              ServiceLineItems: {
                include: { Services: true }
              },
              Vehicles: true
            }
          },
          TransactionDiscounts: true,
          Reviews: true
        }
      },
      Customers: {
        include: { Users: { select: { FullName: true, Phone: true } } }
      },
      PaymentRecords: {
        where: { Status: "Success" }
      },
      Invoices: true
    }
  });

  if (!transaction) throw new Error("Không tìm thấy giao dịch");

  return transaction;
};


const getInvoicePreview = async (transactionId) => {
  const transaction = await fetchInvoiceFullData(transactionId);
  return transaction;
};

const parseDateFilter = (value, fieldName) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return date;
};

const getIssuedInvoices = async (query = {}, actor = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || 10, 1),
    100,
  );
  const where = {};

  if (query.status) {
    where.Status =
      query.status === "CANCELLED" ? "CANCELED" : query.status;
  }

  if (query.invoiceNo?.trim()) {
    where.InvoiceNo = {
      contains: query.invoiceNo.trim(),
    };
  }

  if (query.startDate || query.endDate) {
    where.IssuedAt = {};

    if (query.startDate) {
      where.IssuedAt.gte = parseDateFilter(query.startDate, "Từ ngày");
    }

    if (query.endDate) {
      const endExclusive = parseDateFilter(query.endDate, "Đến ngày");
      endExclusive.setDate(endExclusive.getDate() + 1);
      where.IssuedAt.lt = endExclusive;
    }
  }

  let scopedBranchId = null;

  if (actor.role === "Staff" || actor.role === "Manager") {
    if (!actor.branchId) {
      throw new Error("Tài khoản chưa được phân bổ về chi nhánh nào");
    }

    scopedBranchId = Number(actor.branchId);
  } else if (actor.role === "Admin" && query.branchId) {
    scopedBranchId = Number(query.branchId);
  }

  if (
    scopedBranchId !== null &&
    (!Number.isInteger(scopedBranchId) || scopedBranchId <= 0)
  ) {
    throw new Error("Chi nhánh không hợp lệ");
  }

  if (scopedBranchId !== null) {
    where.Transactions = {
      BookingGroups: {
        BranchID: scopedBranchId,
      },
    };
  }

  const include = {
    Transactions: {
      include: {
        BookingGroups: {
          include: {
            branches: true,
            BookingItems: {
              include: {
                Vehicles: true,
                ServiceLineItems: {
                  include: {
                    Services: true,
                  },
                },
              },
            },
            Reviews: true,
          },
        },
        Customers: {
          include: {
            Users: {
              select: {
                FullName: true,
                Phone: true,
              },
            },
          },
        },
        PaymentRecords: {
          where: {
            Status: "Success",
          },
          orderBy: {
            ConfirmedAt: "desc",
          },
        },
      },
    },
  };

  const [total, invoices] = await prisma.$transaction([
    prisma.invoices.count({
      where,
    }),
    prisma.invoices.findMany({
      where,
      include,
      orderBy: [
        {
          IssuedAt: "desc",
        },
        {
          InvoiceID: "desc",
        },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: invoices,
  };
};


const generateInvoice = async (transactionId) => {
  const transaction = await fetchInvoiceFullData(transactionId);

  if (transaction.Status !== "Paid") {
    throw new Error("Giao dịch chưa thanh toán, không thể xuất hóa đơn.");
  }

  if (transaction.Invoices && transaction.Invoices.length > 0) {
    const existing = transaction.Invoices.find(inv => inv.Status === "ISSUED");
    if (existing) {
      throw new Error(`Hóa đơn đã được xuất trước đó (Mã: ${existing.InvoiceNo})`);
    }
  }

  const invoiceNo = await generateInvoiceNo();

  const newInvoice = await prisma.invoices.create({
    data: {
      TransactionID: transactionId,
      InvoiceNo: invoiceNo,
      IssuedAt: new Date(),
      Status: "ISSUED"
    }
  });

  return newInvoice;
};


const getInvoiceById = async (invoiceId) => {
  const invoice = await prisma.invoices.findUnique({
    where: { InvoiceID: invoiceId }
  });

  if (!invoice) throw new Error("Không tìm thấy Hóa đơn");

  const fullData = await fetchInvoiceFullData(invoice.TransactionID);
  return { ...fullData, CurrentInvoice: invoice };
};


const cancelInvoice = async (invoiceId) => {
  return await prisma.invoices.update({
    where: { InvoiceID: invoiceId },
    data: { Status: "CANCELED" }
  });
};

export default {
  getIssuedInvoices,
  getInvoicePreview,
  generateInvoice,
  getInvoiceById,
  cancelInvoice,
  fetchInvoiceFullData
};
