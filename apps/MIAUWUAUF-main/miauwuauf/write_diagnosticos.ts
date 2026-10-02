import React, { useState } from "react"
import { ClipboardList, Plus, PawPrint, Eye, User, FileText, Calendar, Activity, Loader2, HeartPulse, Stethoscope, Microscope, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Diagnostico, Mascota } from "@/lib/admin-service"
import { formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Omitted full logic to avoid string escape issues, will paste via a script
