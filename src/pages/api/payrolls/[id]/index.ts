import type { NextApiRequest, NextApiResponse } from 'next';
import { roqClient } from 'server/roq';
import { prisma } from 'server/db';
import { errorHandlerMiddleware } from 'server/middlewares';
import { payrollValidationSchema } from 'validationSchema/payrolls';
import { HttpMethod, convertMethodToOperation, convertQueryToPrismaUtil } from 'server/utils';
import { getServerSession } from '@roq/nextjs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roqUserId, user } = await getServerSession(req);
  await prisma.payroll
    .withAuthorization({
      roqUserId,
      tenantId: user.tenantId,
      roles: user.roles,
    })
    .hasAccess(req.query.id as string, convertMethodToOperation(req.method as HttpMethod));

  switch (req.method) {
    case 'GET':
      return getPayrollById();
    case 'PUT':
      return updatePayrollById();
    case 'DELETE':
      return deletePayrollById();
    default:
      return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  async function getPayrollById() {
    const data = await prisma.payroll.findFirst(convertQueryToPrismaUtil(req.query, 'payroll'));
    return res.status(200).json(data);
  }

  async function updatePayrollById() {
    await payrollValidationSchema.validate(req.body);
    const data = await prisma.payroll.update({
      where: { id: req.query.id as string },
      data: {
        ...req.body,
      },
    });

    return res.status(200).json(data);
  }
  async function deletePayrollById() {
    const data = await prisma.payroll.delete({
      where: { id: req.query.id as string },
    });
    return res.status(200).json(data);
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  return errorHandlerMiddleware(handler)(req, res);
}
