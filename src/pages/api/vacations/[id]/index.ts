import type { NextApiRequest, NextApiResponse } from 'next';
import { roqClient } from 'server/roq';
import { prisma } from 'server/db';
import { errorHandlerMiddleware } from 'server/middlewares';
import { vacationValidationSchema } from 'validationSchema/vacations';
import { HttpMethod, convertMethodToOperation, convertQueryToPrismaUtil } from 'server/utils';
import { getServerSession } from '@roq/nextjs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roqUserId, user } = await getServerSession(req);
  await prisma.vacation
    .withAuthorization({
      roqUserId,
      tenantId: user.tenantId,
      roles: user.roles,
    })
    .hasAccess(req.query.id as string, convertMethodToOperation(req.method as HttpMethod));

  switch (req.method) {
    case 'GET':
      return getVacationById();
    case 'PUT':
      return updateVacationById();
    case 'DELETE':
      return deleteVacationById();
    default:
      return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  async function getVacationById() {
    const data = await prisma.vacation.findFirst(convertQueryToPrismaUtil(req.query, 'vacation'));
    return res.status(200).json(data);
  }

  async function updateVacationById() {
    await vacationValidationSchema.validate(req.body);
    const data = await prisma.vacation.update({
      where: { id: req.query.id as string },
      data: {
        ...req.body,
      },
    });

    return res.status(200).json(data);
  }
  async function deleteVacationById() {
    const data = await prisma.vacation.delete({
      where: { id: req.query.id as string },
    });
    return res.status(200).json(data);
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  return errorHandlerMiddleware(handler)(req, res);
}
