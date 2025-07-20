# Database Migration Plan: Enhanced Internship Lifecycle Management

## Overview
This document outlines the database schema enhancements required to implement a comprehensive internship lifecycle management system with proper termination procedures, audit trails, and document management.

## Current Schema Analysis

### Existing Staj Model
```typescript
model Staj {
  id              String     @id @default(cuid())
  studentId       String
  companyId       String
  teacherId       String
  educationYearId String
  startDate       DateTime
  endDate         DateTime
  status          StajStatus @default(ACTIVE)
  terminationDate DateTime?
  createdAt       DateTime   @default(now())
  
  // Relations
  student         Student        @relation(fields: [studentId], references: [id])
  company         Company        @relation(fields: [companyId], references: [id])
  teacher         Teacher        @relation(fields: [teacherId], references: [id])
  educationYear   EducationYear  @relation(fields: [educationYearId], references: [id])
}
```

### Current StajStatus Enum
```typescript
enum StajStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}
```

## Required Schema Enhancements

### 1. Enhanced Staj Model
Add the following fields to support comprehensive lifecycle management:

```typescript
model Staj {
  // ... existing fields ...
  
  // Enhanced termination fields
  terminationReason     String?
  terminatedBy          String?
  terminationDocumentId String?
  terminationNotes      String?
  
  // Audit fields
  lastModifiedBy        String?
  lastModifiedAt        DateTime?
  
  // Relations for termination
  terminatedByUser      User?              @relation("TerminatedBy", fields: [terminatedBy], references: [id])
  terminationDocument   Document?          @relation(fields: [terminationDocumentId], references: [id])
  history              InternshipHistory[]
  
  @@index([studentId, status])
  @@index([companyId, status])
  @@index([teacherId, status])
}
```

### 2. New InternshipHistory Model
Create a comprehensive audit trail system:

```typescript
model InternshipHistory {
  id            String               @id @default(cuid())
  internshipId  String
  action        InternshipAction
  previousData  Json?
  newData       Json?
  performedBy   String
  performedAt   DateTime             @default(now())
  reason        String?
  notes         String?
  
  // Relations
  internship    Staj                 @relation(fields: [internshipId], references: [id], onDelete: Cascade)
  performer     User                 @relation(fields: [performedBy], references: [id])
  
  @@index([internshipId])
  @@index([performedAt])
}

enum InternshipAction {
  CREATED
  ASSIGNED
  COMPANY_CHANGED
  TEACHER_CHANGED
  TERMINATED
  REACTIVATED
  COMPLETED
  UPDATED
}
```

### 3. Enhanced Document Model
Extend the existing Document model for termination documents:

```typescript
model Document {
  // ... existing fields ...
  
  // Add document type for categorization
  documentType          DocumentType?
  relatedInternshipId   String?
  
  // Relations
  relatedInternship     Staj?               @relation(fields: [relatedInternshipId], references: [id])
  terminatedInternships Staj[]              @relation("TerminationDocument")
}

enum DocumentType {
  ASSIGNMENT_DOCUMENT
  TERMINATION_DOCUMENT
  COMPLETION_CERTIFICATE
  EVALUATION_FORM
  OTHER
}
```

### 4. Enhanced StajStatus Enum
Add more granular status options:

```typescript
enum StajStatus {
  ACTIVE
  COMPLETED
  TERMINATED
  CANCELLED
  SUSPENDED
  PENDING_TERMINATION
}
```

## Migration Strategy

### Phase 1: Schema Addition (Safe Migration)
1. Add new optional fields to existing Staj model
2. Create InternshipHistory table
3. Enhance Document model with new optional fields
4. Add new enum values

### Phase 2: Data Migration
1. Populate lastModifiedAt for existing records
2. Create initial history records for existing internships
3. Set default values for new fields

### Phase 3: Constraint Addition
1. Add business logic constraints
2. Add validation rules
3. Add foreign key constraints

## Business Logic Requirements

### 1. Assignment Rules
- A student cannot have multiple ACTIVE internships simultaneously
- A student cannot be assigned to a new company without terminating current internship
- Termination must include reason and performer information

### 2. Status Transitions
Valid status transitions:
- ACTIVE → TERMINATED (with proper termination process)
- ACTIVE → COMPLETED (normal completion)
- ACTIVE → SUSPENDED (temporary suspension)
- SUSPENDED → ACTIVE (reactivation)
- SUSPENDED → TERMINATED (termination from suspension)

Invalid transitions:
- TERMINATED → ACTIVE (must create new internship)
- COMPLETED → any other status (completed is final)

### 3. Audit Trail Requirements
Every change to internship records must:
- Record the action performed
- Store previous and new data states
- Track who performed the action
- Include timestamp and optional reason/notes

## API Endpoints to Implement

### 1. Termination Endpoint
```
POST /api/admin/internships/{id}/terminate
Body: {
  reason: string,
  notes?: string,
  documentId?: string
}
```

### 2. History Endpoint
```
GET /api/admin/internships/{id}/history
GET /api/admin/students/{id}/internship-history
```

### 3. Assignment Validation
```
POST /api/admin/students/{id}/validate-assignment
Body: {
  companyId: string
}
```

## UI Components to Update

### 1. Student Assignment Modal
- Add validation for existing active internships
- Show termination requirement message
- Integrate termination flow

### 2. Internship Management Page
- Add termination actions
- Show termination history
- Display status with proper styling

### 3. Student Detail Pages
- Show complete internship history
- Display terminated internships with reasons
- Add timeline view of student movements

## Security Considerations

### 1. Permission Checks
- Only coordinators can terminate internships
- Only assigned teachers can modify their internships
- Audit trail must be immutable

### 2. Data Validation
- Termination reason is required
- Future start dates validation
- Overlapping internship prevention

## Testing Strategy

### 1. Migration Testing
- Test with existing data
- Verify data integrity
- Check constraint enforcement

### 2. Business Logic Testing
- Test all status transitions
- Verify assignment rules
- Check audit trail accuracy

### 3. UI Testing
- Test assignment flows
- Verify termination processes
- Check history displays

## Implementation Phases

### Phase 1: Database Foundation ✅ Next
1. Create Prisma migration
2. Add new fields and models
3. Test migration on development data

### Phase 2: Core Business Logic
1. Implement termination API
2. Add assignment validation
3. Create audit trail system

### Phase 3: UI Enhancement
1. Update assignment components
2. Add termination interfaces
3. Create history views

### Phase 4: Integration & Testing
1. End-to-end testing
2. Performance optimization
3. Documentation updates

## Risk Mitigation

### 1. Data Safety
- Use transactions for all critical operations
- Implement rollback procedures
- Backup before migration

### 2. System Stability
- Gradual rollout of features
- Feature flags for new functionality
- Monitoring and logging

### 3. User Experience
- Clear error messages
- Intuitive termination flows
- Comprehensive help documentation

## Success Criteria

### 1. Data Integrity
- No data loss during migration
- All relationships preserved
- Audit trail complete and accurate

### 2. Business Requirements
- Proper termination workflow implemented
- Historical tracking functional
- Assignment validation working

### 3. User Experience
- Intuitive interface for terminations
- Clear status indicators
- Comprehensive history views

---

**Next Step**: Switch to Code mode to implement the Prisma migration and begin Phase 1 implementation.