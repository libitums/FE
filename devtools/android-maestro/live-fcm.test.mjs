import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  dataMessage,
  firebaseClient,
  rawTokenFromPrefs,
  serviceAccountAssertion,
  serviceAccountForProject,
} from "./live-fcm.mjs";

const config = {
  project_info: { project_id: "duru-2eaed", project_number: "110633316246" },
  client: [{ client_info: { android_client_info: { package_name: "com.libitum.host" } } }],
};

test("selects the exact Android package and Firebase sender", () => {
  assert.deepEqual(firebaseClient(config), {
    projectId: "duru-2eaed",
    senderId: "110633316246",
  });
  assert.equal(firebaseClient({ ...config, client: [] }), null);
  assert.equal(firebaseClient({ ...config, client: "not-an-array" }), null);
});

test("rejects a service account for another Firebase project", () => {
  const account = {
    type: "service_account",
    project_id: "duru-2eaed",
    client_email: "sender@duru-2eaed.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----\n",
  };
  assert.equal(serviceAccountForProject(account, "duru-2eaed"), account);
  assert.equal(serviceAccountForProject(account, "another-project"), null);
  assert.equal(
    serviceAccountForProject({ ...account, type: "authorized_user" }, "duru-2eaed"),
    null,
  );
});

test("reads only the matching sender's raw token from Debug Firebase preferences", () => {
  const xml =
    '<map><string name="|T|other|*">other-token-with-enough-characters</string>' +
    '<string name="|T|110633316246|*">real-token-with-enough-characters:abc</string></map>';
  assert.equal(rawTokenFromPrefs(xml, "110633316246"), "real-token-with-enough-characters:abc");
  assert.equal(rawTokenFromPrefs(xml, "999"), null);
});

test("sends the production high-priority data-only contract", () => {
  assert.deepEqual(dataMessage("real-token-with-enough-characters:abc"), {
    message: {
      token: "real-token-with-enough-characters:abc",
      data: {
        title: "Duru remote test",
        body: "Open notifications",
        target: '{"kind":"notifications"}',
      },
      android: { priority: "HIGH" },
    },
  });
});

test("signs the Firebase Messaging OAuth scope with the service account", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const assertion = serviceAccountAssertion(
    {
      client_email: "sender@duru-2eaed.iam.gserviceaccount.com",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
    },
    1_800_000_000,
  );
  const [header, payload, signature] = assertion.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url")), {
    iss: "sender@duru-2eaed.iam.gserviceaccount.com",
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: 1_800_000_000,
    exp: 1_800_003_600,
  });
  const verify = createVerify("RSA-SHA256");
  verify.update(`${header}.${payload}`);
  assert.equal(verify.verify(publicKey, Buffer.from(signature, "base64url")), true);
});
