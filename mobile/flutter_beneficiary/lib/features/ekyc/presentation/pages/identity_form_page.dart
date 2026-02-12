import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../ekyc_progress_store.dart';
import '../widgets/ekyc_progress_footer.dart';

class IdentityFormPage extends StatefulWidget {
  const IdentityFormPage({super.key});

  @override
  State<IdentityFormPage> createState() => _IdentityFormPageState();
}

class _IdentityFormPageState extends State<IdentityFormPage> {
  static const _totalSteps = 4;
  int _step = 1;
  bool _showErrors = false;

  final _formKey = GlobalKey<FormState>();

  final _nikController = TextEditingController(text: '3175091201990001');
  final _nameController = TextEditingController(text: 'RIZKY PRATAMA');
  final _birthPlaceController = TextEditingController(text: 'Jakarta');
  DateTime? _birthDate = DateTime(1999, 1, 12);
  final _birthDateController = TextEditingController();
  String? _gender = 'Laki-laki';
  String? _religion;
  String? _maritalStatus;

  bool? _domicileSame;
  String? _buildingType;
  final _addressController = TextEditingController();
  final _houseNumberController = TextEditingController();
  final _rtController = TextEditingController();
  final _rwController = TextEditingController();
  final _provinceController = TextEditingController();
  final _cityController = TextEditingController();
  final _districtController = TextEditingController();
  final _subdistrictController = TextEditingController();

  final _relativeNameController = TextEditingController();
  String? _relativeRelation;
  final _relativePhoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (EkycProgressStore.statusOf('identity') != EkycStepStatus.done) {
      EkycProgressStore.setStatus('identity', EkycStepStatus.inProgress);
    }
  }

  @override
  void dispose() {
    _nikController.dispose();
    _nameController.dispose();
    _birthPlaceController.dispose();
    _birthDateController.dispose();
    _addressController.dispose();
    _houseNumberController.dispose();
    _rtController.dispose();
    _rwController.dispose();
    _provinceController.dispose();
    _cityController.dispose();
    _districtController.dispose();
    _subdistrictController.dispose();
    _relativeNameController.dispose();
    _relativePhoneController.dispose();
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = _birthDate ?? DateTime(now.year - 20, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900, 1, 1),
      lastDate: DateTime(now.year - 10, 12, 31),
    );
    if (picked != null) {
      setState(() {
        _birthDate = picked;
        _birthDateController.text =
            '${picked.day.toString().padLeft(2, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.year}';
      });
    }
  }

  bool _validateCurrentStep() {
    final formValid = _formKey.currentState?.validate() ?? false;
    if (_step == 2 && _domicileSame == null) {
      return false;
    }
    if (_step == 3 && _domicileSame == false) {
      return formValid;
    }
    return formValid;
  }

  void _nextStep() {
    if (!_validateCurrentStep()) {
      setState(() {
        _showErrors = true;
      });
      return;
    }
    _showErrors = false;
    if (_step == 2 && _domicileSame == true) {
      setState(() => _step = 4);
      return;
    }
    if (_step < _totalSteps) {
      setState(() => _step += 1);
      return;
    }
    EkycProgressStore.setStatus('identity', EkycStepStatus.done);
    Navigator.of(context).pop();
  }

  Future<bool> _handleBack() async {
    EkycProgressStore.setStatus('identity', EkycStepStatus.pending);
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _handleBack,
      child: Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          title: const Text('Registrasi'),
          centerTitle: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () async {
              if (await _handleBack()) {
                Navigator.of(context).maybePop();
              }
            },
          ),
          actions: const [
            Padding(
              padding: EdgeInsets.only(right: Dimens.spacing12),
              child: Icon(Icons.help_outline),
            ),
          ],
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(
                    Dimens.spacing16,
                    Dimens.spacing12,
                    Dimens.spacing16,
                    Dimens.spacing16,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Form(
                        key: _formKey,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_step == 1) ..._buildKtpFields(),
                            if (_step == 2) ..._buildDomicileCheck(),
                            if (_step == 3 && _domicileSame == false)
                              ..._buildDomicileDetails(),
                            if (_step == 4) ..._buildRelativeInfo(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              EkycProgressFooter(
                title: 'KTP & Identitas',
                currentStep: _step,
                totalSteps: _totalSteps,
                enableAction: true,
                onAction: _nextStep,
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildKtpFields() {
    if (_birthDateController.text.isEmpty && _birthDate != null) {
      _birthDateController.text =
          '${_birthDate!.day.toString().padLeft(2, '0')}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.year}';
    }
    return [
      const Text(
        'Lengkapi Identitas Diri',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: Dimens.spacing8),
      const Text(
        'Data berikut diambil dari hasil OCR KTP. Periksa kembali sebelum lanjut.',
        style: TextStyle(color: AppColors.textSecondary),
      ),
      const SizedBox(height: Dimens.spacing16),
      TextFormField(
        controller: _nikController,
        readOnly: true,
        decoration: const InputDecoration(labelText: 'Nomor KTP'),
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _nameController,
        readOnly: true,
        decoration: const InputDecoration(labelText: 'Nama Lengkap'),
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _birthPlaceController,
        decoration: const InputDecoration(labelText: 'Tempat Lahir'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      GestureDetector(
        onTap: _pickBirthDate,
        child: AbsorbPointer(
          child: TextFormField(
            decoration: const InputDecoration(
              labelText: 'Tanggal Lahir',
              suffixIcon: Icon(Icons.date_range_outlined),
            ),
            controller: _birthDateController,
            validator: (_) => _birthDate == null ? 'Wajib diisi' : null,
          ),
        ),
      ),
      const SizedBox(height: Dimens.spacing12),
      DropdownButtonFormField<String>(
        value: _gender,
        decoration: const InputDecoration(labelText: 'Jenis Kelamin'),
        items: const [
          DropdownMenuItem(value: 'Laki-laki', child: Text('Laki-laki')),
          DropdownMenuItem(value: 'Perempuan', child: Text('Perempuan')),
        ],
        onChanged: (value) => setState(() => _gender = value),
        validator: (value) => value == null ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      DropdownButtonFormField<String>(
        value: _religion,
        decoration: const InputDecoration(labelText: 'Agama'),
        items: const [
          DropdownMenuItem(value: 'Islam', child: Text('Islam')),
          DropdownMenuItem(value: 'Kristen', child: Text('Kristen')),
          DropdownMenuItem(value: 'Katolik', child: Text('Katolik')),
          DropdownMenuItem(value: 'Hindu', child: Text('Hindu')),
          DropdownMenuItem(value: 'Buddha', child: Text('Buddha')),
          DropdownMenuItem(value: 'Konghucu', child: Text('Konghucu')),
        ],
        onChanged: (value) => setState(() => _religion = value),
        validator: (value) => value == null ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      DropdownButtonFormField<String>(
        value: _maritalStatus,
        decoration: const InputDecoration(labelText: 'Status Perkawinan'),
        items: const [
          DropdownMenuItem(value: 'Belum Kawin', child: Text('Belum Kawin')),
          DropdownMenuItem(value: 'Kawin', child: Text('Kawin')),
          DropdownMenuItem(value: 'Cerai Hidup', child: Text('Cerai Hidup')),
          DropdownMenuItem(value: 'Cerai Mati', child: Text('Cerai Mati')),
        ],
        onChanged: (value) => setState(() => _maritalStatus = value),
        validator: (value) => value == null ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      if (_showErrors &&
          (_birthPlaceController.text.isEmpty ||
              _gender == null ||
              _religion == null ||
              _maritalStatus == null ||
              _birthDate == null))
        const Text(
          'Lengkapi data yang masih kosong.',
          style: TextStyle(color: AppColors.danger),
        ),
      const SizedBox(height: Dimens.spacing24),
    ];
  }

  List<Widget> _buildDomicileCheck() {
    return [
      const Text(
        'Apa kamu sekarang tinggal di alamat KTP?',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: Dimens.spacing16),
      Row(
        children: [
          Expanded(
            child: _ChoiceTile(
              label: 'Ya',
              selected: _domicileSame == true,
              onTap: () => setState(() => _domicileSame = true),
            ),
          ),
          const SizedBox(width: Dimens.spacing12),
          Expanded(
            child: _ChoiceTile(
              label: 'Tidak',
              selected: _domicileSame == false,
              onTap: () => setState(() => _domicileSame = false),
            ),
          ),
        ],
      ),
      const SizedBox(height: Dimens.spacing12),
      if (_domicileSame == null)
        const Text(
          'Pilih salah satu jawaban.',
          style: TextStyle(color: AppColors.danger),
        ),
      const SizedBox(height: Dimens.spacing24),
    ];
  }

  List<Widget> _buildDomicileDetails() {
    return [
      const Text(
        'Informasi tempat tinggalmu saat ini dibutuhkan sebagai salah satu syarat dari OJK.',
        style: TextStyle(color: AppColors.textSecondary),
      ),
      const SizedBox(height: Dimens.spacing16),
      DropdownButtonFormField<String>(
        value: _buildingType,
        decoration: const InputDecoration(labelText: 'Jenis bangunan'),
        items: const [
          DropdownMenuItem(value: 'Rumah', child: Text('Rumah')),
          DropdownMenuItem(value: 'Sewa Kos', child: Text('Sewa Kos')),
        ],
        onChanged: (value) => setState(() => _buildingType = value),
        validator: (value) => value == null ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _addressController,
        maxLength: 35,
        decoration: const InputDecoration(labelText: 'Alamat (Nama jalan)'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _houseNumberController,
        decoration: const InputDecoration(labelText: 'Nomor rumah'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      Row(
        children: [
          Expanded(
            child: TextFormField(
              controller: _rtController,
              maxLength: 3,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'RT'),
              validator: (value) =>
                  (value == null || value.isEmpty) ? 'Wajib diisi' : null,
            ),
          ),
          const SizedBox(width: Dimens.spacing12),
          Expanded(
            child: TextFormField(
              controller: _rwController,
              maxLength: 3,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'RW'),
              validator: (value) =>
                  (value == null || value.isEmpty) ? 'Wajib diisi' : null,
            ),
          ),
        ],
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _provinceController,
        decoration: const InputDecoration(labelText: 'Provinsi'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _cityController,
        decoration: const InputDecoration(labelText: 'Kabupaten'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _districtController,
        decoration: const InputDecoration(labelText: 'Kecamatan'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _subdistrictController,
        decoration: const InputDecoration(labelText: 'Kelurahan'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing24),
    ];
  }

  List<Widget> _buildRelativeInfo() {
    return [
      const Text(
        'Masukkan informasi kerabat dekatmu',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: Dimens.spacing8),
      const Text(
        'Kerabat harus keluarga atau teman dekat yang tidak tinggal satu alamat denganmu.',
        style: TextStyle(color: AppColors.textSecondary),
      ),
      const SizedBox(height: Dimens.spacing16),
      TextFormField(
        controller: _relativeNameController,
        maxLength: 35,
        decoration: const InputDecoration(labelText: 'Nama kerabat'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      DropdownButtonFormField<String>(
        value: _relativeRelation,
        decoration: const InputDecoration(labelText: 'Hubungan denganmu'),
        items: const [
          DropdownMenuItem(value: 'Orang tua', child: Text('Orang tua')),
          DropdownMenuItem(value: 'Saudara', child: Text('Saudara')),
          DropdownMenuItem(value: 'Teman dekat', child: Text('Teman dekat')),
        ],
        onChanged: (value) => setState(() => _relativeRelation = value),
        validator: (value) => value == null ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing12),
      TextFormField(
        controller: _relativePhoneController,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'Nomor handphone'),
        validator: (value) =>
            (value == null || value.isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: Dimens.spacing24),
    ];
  }
}

class _ChoiceTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ChoiceTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(Dimens.borderRadius12),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: Dimens.spacing20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Dimens.borderRadius12),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.black12,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? AppColors.primary : Colors.black26,
                ),
              ),
              child: selected
                  ? Center(
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: Dimens.spacing8),
            Text(
              label,
              style: TextStyle(
                color: selected
                    ? AppColors.textPrimary
                    : AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
