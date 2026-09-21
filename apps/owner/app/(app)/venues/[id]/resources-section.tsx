'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListResourceTypes } from '@iziwellpass/api/generated';
import type { Resource } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';

import {
  AddResourceDialog,
  DeleteResourceDialog,
  EditResourceDialog,
  NewResourceTypeDialog,
} from './resource-dialogs';

/**
 * « Ressources »: a 22px heading with the dark small « + Ajouter une ressource »
 * (spec D1), a hairline table Nom 168 · Type 180 · Capacité 90 · 64 at 46px
 * rows, and a ghost small « Nouveau type de ressource » beneath.
 */
export function ResourcesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const t = useTranslations('venues');
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const resourceTypesQuery = useListResourceTypes({ query: { select: unwrap } });
  const resourceTypes = useMemo(() => resourceTypesQuery.data ?? [], [resourceTypesQuery.data]);
  const resourceTypeById = useMemo(
    () => new Map(resourceTypes.map((type) => [type.id, type])),
    [resourceTypes],
  );
  const resources = resourcesQuery.data ?? [];

  // Overlays stay mounted after close so focus returns to the row menu.
  const [editing, setEditing] = useState<Resource | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.resources.title')}
        action={
          canEdit && resources.length > 0 ? (
            <AddResourceDialog venueId={venueId} resourceTypes={resourceTypes} />
          ) : undefined
        }
      />
      {resourcesQuery.isLoading ? (
        <RowsSkeleton rows={3} />
      ) : resourcesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(resourcesQuery.error, t('detail.resources.loadError'))}
          </AlertDescription>
        </Alert>
      ) : resources.length === 0 ? (
        <Empty>
          <EmptyTitle>{t('detail.resources.empty.title')}</EmptyTitle>
          <EmptyDescription>{t('detail.resources.empty.body')}</EmptyDescription>
          {canEdit ? (
            <EmptyContent>
              <AddResourceDialog
                venueId={venueId}
                resourceTypes={resourceTypes}
                variant="secondary"
                size="default"
              />
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[168px]">{t('detail.resources.columns.name')}</TableHead>
              <TableHead>{t('detail.resources.columns.type')}</TableHead>
              <TableHead className="w-[90px]" numeric>
                {t('detail.resources.columns.capacity')}
              </TableHead>
              {canEdit ? (
                <TableHead className="w-16 text-right">
                  <span className="sr-only">{t('detail.resources.columns.actions')}</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell className="truncate font-medium">{resource.name}</TableCell>
                <TableCell className="truncate">
                  {resourceTypeById.get(resource.resource_type_id)?.name ??
                    t('detail.resources.unknownType')}
                </TableCell>
                <TableCell numeric className="font-medium">
                  {resource.capacity}
                </TableCell>
                {canEdit ? (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('detail.resources.row.menu')}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(resource);
                            setEditOpen(true);
                          }}
                        >
                          <PencilIcon />
                          {t('detail.resources.row.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setDeleting(resource);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2Icon />
                          {t('detail.resources.row.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {canEdit ? (
        <div>
          <NewResourceTypeDialog onCreated={() => undefined} />
        </div>
      ) : null}
      {editing ? (
        <EditResourceDialog
          venueId={venueId}
          resource={editing}
          resourceTypes={resourceTypes}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
      {deleting ? (
        <DeleteResourceDialog
          venueId={venueId}
          resource={deleting}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </section>
  );
}
