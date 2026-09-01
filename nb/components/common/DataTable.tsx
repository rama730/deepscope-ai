"use client"

import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export interface ColumnDef<TData> {
    header: string;
    accessorKey?: keyof TData;
    cell?: (info: { row: { original: TData } }) => React.ReactNode;
}

interface DataTableProps<TData> {
    columns: ColumnDef<TData>[]
    data: TData[]
}

export function DataTable<TData>({
    columns,
    data,
}: DataTableProps<TData>) {
    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col, idx) => (
                            <TableHead key={idx} className="whitespace-nowrap">{col.header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length ? (
                        data.map((row, rIdx) => (
                            <TableRow key={rIdx}>
                                {columns.map((col, cIdx) => (
                                    <TableCell key={cIdx}>
                                        {col.cell
                                            ? col.cell({ row: { original: row } })
                                            : (col.accessorKey ? String(row[col.accessorKey]) : null)
                                        }
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

