import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client } from '../types';
import { ArchitectureService, hasActiveArchitectureModule } from './architectureService';

interface SyncFixture {
  clients: Client[];
  projects: any[];
  tasks: any[];
  deliverables: any[];
  meetings: any[];
  documents: any[];
  budgets: any[];
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fixtureFor(organizationId: number): SyncFixture {
  return {
    clients: [{
      id: organizationId,
      organizationId,
      name: `Organization ${organizationId}`,
      taxId: '',
      email: '',
      phone: '',
      address: '',
      type: 'Empresa',
      status: 'Activo',
      createdAt: new Date(0).toISOString(),
    }],
    projects: [],
    tasks: [],
    deliverables: [],
    meetings: [],
    documents: [],
    budgets: [],
  };
}

function createService(deferredForOrganization: (organizationId: number) => Deferred<SyncFixture>) {
  const api = {
    getClients: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.clients),
    getProjects: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.projects),
    getTasks: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.tasks),
    getDeliverables: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.deliverables),
    getMeetings: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.meetings),
    getDocuments: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.documents),
    getBudgets: (organizationId: number) => deferredForOrganization(organizationId).promise.then((data) => data.budgets),
  } as never;

  return new ArchitectureService(api);
}

test('normal sync commits data and reports the current organization status', async () => {
  const deferred = createDeferred<SyncFixture>();
  const service = createService(() => deferred);
  const sync = service.setOrganizationId(3);

  assert.deepEqual(service.getSyncState(), { organizationId: 3, status: 'loading', error: null });
  deferred.resolve(fixtureFor(3));
  await sync;

  assert.equal(service.getClients()[0]?.organizationId, 3);
  assert.deepEqual(service.getSyncState(), { organizationId: 3, status: 'success', error: null });
});

test('rapid organization switch discards out-of-order response from the earlier organization', async () => {
  const deferreds = new Map<number, Deferred<SyncFixture>>([
    [11, createDeferred<SyncFixture>()],
    [22, createDeferred<SyncFixture>()],
  ]);
  const service = createService((organizationId) => deferreds.get(organizationId)!);
  const firstSync = service.setOrganizationId(11);
  const secondSync = service.setOrganizationId(22);

  deferreds.get(22)!.resolve(fixtureFor(22));
  await secondSync;
  deferreds.get(11)!.resolve(fixtureFor(11));
  await firstSync;

  assert.equal(service.getOrganizationId(), 22);
  assert.equal(service.getClients()[0]?.organizationId, 22);
  assert.deepEqual(service.getSyncState(), { organizationId: 22, status: 'success', error: null });
});

test('an older failed request cannot replace current organization data or error state', async () => {
  const deferreds = new Map<number, Deferred<SyncFixture>>([
    [4, createDeferred<SyncFixture>()],
    [5, createDeferred<SyncFixture>()],
  ]);
  const service = createService((organizationId) => deferreds.get(organizationId)!);
  const oldSync = service.setOrganizationId(4);
  const currentSync = service.setOrganizationId(5);

  deferreds.get(5)!.resolve(fixtureFor(5));
  await currentSync;
  deferreds.get(4)!.reject(new Error('old organization failed'));
  await oldSync;

  assert.equal(service.getClients()[0]?.organizationId, 5);
  assert.deepEqual(service.getSyncState(), { organizationId: 5, status: 'success', error: null });
});

test('StrictMode-style cleanup and remount invalidates the first mount sync', async () => {
  const deferreds = new Map<number, Deferred<SyncFixture>>([
    [31, createDeferred<SyncFixture>()],
    [32, createDeferred<SyncFixture>()],
  ]);
  const service = createService((organizationId) => deferreds.get(organizationId)!);
  const firstMountSync = service.setOrganizationId(31);

  await service.setOrganizationId(null);
  const remountedSync = service.setOrganizationId(32);
  deferreds.get(32)!.resolve(fixtureFor(32));
  await remountedSync;
  deferreds.get(31)!.resolve(fixtureFor(31));
  await firstMountSync;

  assert.equal(service.getClients()[0]?.organizationId, 32);
  assert.equal(service.getSyncState().organizationId, 32);
});

test('organizations without an active Architecture module are not eligible', () => {
  assert.equal(hasActiveArchitectureModule([]), false);
  assert.equal(hasActiveArchitectureModule([{ status: 'INACTIVE', module: { code: 'ARCHITECTURE' } }]), false);
  assert.equal(hasActiveArchitectureModule([{ status: 'ACTIVE', module: { code: 'MEDICINE' } }]), false);
  assert.equal(hasActiveArchitectureModule([{ status: 'ACTIVE', module: { code: 'ARCHITECTURE' } }]), true);
});